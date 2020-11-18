package crypto

import (
	"encoding/base64"
	"encoding/json"
	"errors"
	"os"
	"time"

	vault "github.com/hashicorp/vault/api"
	"go.alargerobot.dev/notebook/common"
)

const (
	tokenRenewTime       = 1440
	tokenRenewTimeStr    = "60s"
	vaultKVPath          = "/secret/notebook/"
	vaultKVPrefix        = "notes"
	vaultDecryptEndpoint = "/transit/decrypt/"
	vaultEncryptEndpoint = "/transit/encrypt/"
	vaultDataKeyEndpoint = "/transit/datakey/plaintext/"
	vaultDBCredsEndpoint = "/database/creds/notebook-service"
)

//VaultKMS ...
type VaultKMS struct {
	stopRefresh      bool
	dev              bool
	client           *vault.Client
	renewer          *vault.Renewer
	currentAuthToken string
	currentBaseToken string
}

//Context extra info describing usage of a particular key. Useful in generating derived keys.
type Context map[string]string

//NewVaultKMS ...
func NewVaultKMS(dev bool) *VaultKMS {
	var vaultAddr string
	if value, exists := os.LookupEnv("VAULTADDR"); exists {
		vaultAddr = value
	} else {
		vaultAddr = common.CurrentConfig.VaultEndpoint
	}

	c, err := vault.NewClient(&vault.Config{Address: vaultAddr})
	if err != nil {
		if dev == false {
			panic(err)
		} else {
			common.LogError("", err)
		}
	}
	kms := VaultKMS{client: c, dev: dev}
	kms.setAccessToken()
	return &kms
}

//GenerateKey Generates a data key. Returns plaintext and encrypted (or "sealed") forms of the key. Or an error.
func (kms *VaultKMS) GenerateKey(keyID string, ctx Context) (key [32]byte, sealed []byte, e error) {
	if bytes, err := json.Marshal(&ctx); err == nil {
		payload := map[string]interface{}{
			"context": base64.StdEncoding.EncodeToString(bytes),
		}
		if newKey, err := kms.client.Logical().Write(vaultDataKeyEndpoint+keyID, payload); err == nil {
			sealedKey := newKey.Data["ciphertext"].(string)
			if notsealed, err := base64.StdEncoding.DecodeString(newKey.Data["plaintext"].(string)); err != nil {
				return key, sealed, err
			} else {
				copy(key[:], []byte(notsealed))
				return key, []byte(sealedKey), nil
			}
		} else {
			common.LogError("", err)
			return key, sealed, err
		}
	} else {
		return key, sealed, err
	}
}

//GetDBCredentials Gets a username-password pair for the DB from Vault
func (kms *VaultKMS) GetDBCredentials() (string, string, error) {
	common.LogDebug("", "", "GetDBCredentials")
	credsEndpoint := vaultDBCredsEndpoint
	if kms.dev == false {
		credsEndpoint += "-prod"
	}
	if creds, err := kms.client.Logical().Read(credsEndpoint); err == nil {
		credRenewer, err := kms.client.NewRenewer(&vault.RenewerInput{Secret: creds})
		if err != nil {
			return "", "", err
		}
		kms.dbCredsRenewer(credRenewer)
		return creds.Data["username"].(string), creds.Data["password"].(string), nil
	} else {
		return "", "", err
	}
}

//Encrypt Encrypts a plainBlob using the key named in the global config. Returns a cipherBlob. Or an error
func (kms *VaultKMS) Encrypt(plainBlob string) (string, error) {
	keyID := common.CurrentConfig.VaultKeyName
	payload := map[string]interface{}{
		"plaintext": base64.StdEncoding.EncodeToString([]byte(plainBlob)),
	}
	if ciphertext, err := kms.client.Logical().Write(vaultEncryptEndpoint+keyID, payload); err == nil {
		return ciphertext.Data["ciphertext"].(string), nil
	} else {
		return "", err
	}
}

//Decrypt Decrypts a given cipherBlob using the key named in the global config. Returns a plainBlob. Or an error
func (kms *VaultKMS) Decrypt(cipherBlob string) ([]byte, error) {
	keyID := common.CurrentConfig.VaultKeyName
	payload := map[string]interface{}{
		"ciphertext": cipherBlob,
	}
	if plaintext, err := kms.client.Logical().Write(vaultDecryptEndpoint+keyID, payload); err == nil {
		return base64.StdEncoding.DecodeString(plaintext.Data["plaintext"].(string))
	} else {
		return nil, err
	}
}

//WriteKeyToKVStorage Writes decryption key to the specified route in Vault
func (kms *VaultKMS) WriteKeyToKVStorage(key, path string) error {
	kvPrefix := vaultKVPrefix
	payload := map[string]interface{}{}
	payload["key"] = key
	if common.DevMode {
		kvPrefix += "-dev"
	}
	if _, e := kms.client.Logical().Write(vaultKVPath+"/"+kvPrefix+"/"+path, payload); e != nil {
		return e
	}
	return nil
}

//ReadKeyFromKV Read a decryption key stored at the specified path from Vault
func (kms *VaultKMS) ReadKeyFromKV(path string) (string, error) {
	kvPrefix := vaultKVPrefix
	if common.DevMode {
		kvPrefix += "-dev"
	}
	if value, e := kms.client.Logical().Read(vaultKVPath + "/" + kvPrefix + "/" + path); e != nil {
		return "", e
	} else {
		if value != nil {
			return value.Data["key"].(string), nil
		} else {
			return "", common.LogError("", errors.New("not found"))
		}
	}
}

//DeleteKeyFromKV Deletes a decryption key stored at the specified path
func (kms *VaultKMS) DeleteKeyFromKV(path string) error {
	kvPrefix := vaultKVPrefix
	if common.DevMode {
		kvPrefix += "-dev"
	}
	if _, e := kms.client.Logical().Delete(vaultKVPath + "/" + kvPrefix + "/" + path); e != nil {
		return common.LogError("", e)
	}
	return nil
}

//UnsealKey Unseals the provided key using the provided master key. Returns plaintext key. Or an error.
func (kms *VaultKMS) UnsealKey(keyID string, sealedKey []byte, ctx Context) (key [32]byte, e error) {
	if bytes, err := json.Marshal(&ctx); err == nil {
		payload := map[string]interface{}{
			"ciphertext": string(sealedKey),
			"context":    base64.StdEncoding.EncodeToString(bytes),
		}
		if unsealed, err := kms.client.Logical().Write(vaultDecryptEndpoint+keyID, payload); err == nil {
			base64Key := unsealed.Data["plaintext"].(string)
			if plainKey, err := base64.StdEncoding.DecodeString(base64Key); err == nil {
				copy(key[:], []byte(plainKey))
				return key, nil
			} else {
				common.LogError("", err)
				return key, err
			}
		} else {
			common.LogError("", err)
			return key, err
		}
	} else {
		common.LogError("", err)
		return key, err
	}
}

//RenewToken Renews a token
func (kms *VaultKMS) RenewToken() *vault.Secret {
	if s, e := kms.client.Auth().Token().RenewTokenAsSelf(kms.client.Token(), 120); e == nil {
		kms.client.SetToken(s.Auth.ClientToken)
		// common.LogError("saving renewed token failed.", kms.updateVaultToken(s, "dc-service"))
		return s
	}
	return nil
}

func (kms *VaultKMS) dbCredsRenewer(renewer *vault.Renewer) {
	go func() {
		renewer.Renew()
		defer renewer.Stop()
		for {
			select {
			case err := <-renewer.DoneCh():
				if err != nil {
					common.LogError("dbCredsRenewer", err)
				}
			case renewal := <-renewer.RenewCh():
				common.LogInfo("timestamp", renewal.RenewedAt, "renewal successful")
			}
		}
	}()
}
func (kms *VaultKMS) tokenRenewalTimer() {
	go func() {
		for {
			if !kms.stopRefresh {
				select {
				case <-time.After(kms.getTokenLeaseTime()):
					kms.RenewToken()
				}
			} else {
				break
			}
		}
	}()
}

func (kms *VaultKMS) setAccessToken() {
	if loginErr := kms.login(); loginErr != nil {
		common.LogWarn("loginType", "AppRole", loginErr)
		// if common.CurrentConfig.VaultBaseAuthToken != "" {
		// 	kms.client.SetToken(common.CurrentConfig.VaultBaseAuthToken)
		// 	common.UnsetVaultToken()
		// } else {
		// 	if t, e := kms.getVaultToken("dc-service"); e == nil {
		// 		kms.client.SetToken(t.Auth.ClientToken)
		// 		kms.RenewToken()
		// 	} else {
		// 		common.LogError("", e)
		// 	}
		// }
	} else {
		kms.tokenRenewalTimer()
	}
}
func (kms *VaultKMS) getTokenLeaseTime() time.Duration {
	var tokenDuration time.Duration
	if s, err := kms.client.Auth().Token().LookupSelf(); err == nil {
		td, _ := s.TokenTTL()
		if td > 0 {
			tokenDuration = time.Duration(td.Seconds()-20) * time.Second
		} else {
			common.LogWarn("", "", "this token has no lease duration for some reason. Defaulting to 600 seconds")
			tokenDuration = time.Duration(600) * time.Second
		}
	} else {
		common.LogError("", err)
		if !kms.dev {
			panic(err)
		} else {
			kms.stopRefresh = true
			return time.Duration(0 * time.Second)
		}
	}
	return tokenDuration
}

//Login Grabs AppRole ID and AppRole Secret ID accessor token from the environment and uses them to login to
//the Vault server at the address specified by the VAULTADDR environment var. The AppRole Secret ID accessor
//is a very short lived token that only has access to AppRole Secret ID for this service.
func (kms *VaultKMS) login() error {
	kms.client.SetToken(os.Getenv("ARSID_ACCESS_KEY"))
	if arsid, e := kms.client.Logical().Write("auth/approle/role/notebook/secret-id", nil); e == nil {
		t, e := kms.client.Logical().Write("auth/approle/login", map[string]interface{}{"role_id": os.Getenv("APPROLE_ID"), "secret_id": arsid.Data["secret_id"].(string)})
		if e != nil {
			return e
		}
		kms.client.SetToken(t.Auth.ClientToken)
		return nil
	} else {
		return e
	}
}
