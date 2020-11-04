package notebook

import (
	"encoding/base64"
	"io/ioutil"
	"os"

	"go.alargerobot.dev/notebook/crypto"
	"go.alargerobot.dev/notebook/data"
)

//ServiceAPI ...
type ServiceAPI struct {
	data        *data.DataStore
	vaultClient *crypto.VaultKMS
}

//NewNBServiceAPI ...
func NewNBServiceAPI(db *data.DataStore, vault *crypto.VaultKMS) *ServiceAPI {
	if _, err := os.Stat("notebooks"); os.IsNotExist(err) {
		err := os.Mkdir("notebooks", 0600)
		if err != nil {
			panic(err)
		}
	}
	return &ServiceAPI{data: db, vaultClient: vault}
}

//GetPages ...
func (notesAPI *ServiceAPI) GetPages(notebookID string) ([]data.PageReference, error) {
	return notesAPI.data.GetContentsOfNotebook(notebookID)
}

//GetPageMetadata ...
func (notesAPI *ServiceAPI) GetPageMetadata(pageID string) (data.Page, error) {
	return notesAPI.data.GetPageByID(pageID)
}

//GetNotebooks ...
func (notesAPI *ServiceAPI) GetNotebooks(username string) ([]data.NotebookReference, error) {
	return notesAPI.data.GetUserNotebookNames(username)
}

//NewPage ...
func (notesAPI *ServiceAPI) NewPage(page data.NewPageRequest) error {
	content, err := base64.StdEncoding.DecodeString(page.ContentAsBase64)
	if err != nil {
		return err
	}

	//TODO: Validate tags

	if err := notesAPI.data.NewPage(page.Metadata, page.NotebookID); err != nil {
		return err
	}

	wd, _ := os.Getwd()
	path := wd + "/notebooks/" + page.NotebookID + "/" + page.Metadata.ID

	if vKey, vSealed, err := notesAPI.vaultClient.GenerateKey("notebook", crypto.Context{"pageID": page.Metadata.ID}); err == nil {
		cryptoKey := crypto.GenerateKey(vKey[:], "notes/"+page.NotebookID+"/"+page.Metadata.ID)
		sealed, _ := cryptoKey.Seal(vKey[:], page.NotebookID+"/"+page.Metadata.ID)
		file, err := os.OpenFile(path, os.O_CREATE|os.O_WRONLY, 0600)
		if err != nil {
			return err
		}
		if encryptedWriter, err := sio.EncryptWriter(file, sio.Config{Key: cryptoKey[:], MinVersion: sio.Version20}); err == nil {
			encryptedWriter.Write([]byte(content))
			if err = encryptedWriter.Close(); err != nil {
				return err
			}
			entryCryptoKey := crypto.PageEncryptionKey{EntryKey: sealed, SealedMasterKey: vSealed}
			ecKey, _ := json.Marshal(entryCryptoKey)
			if e := notesAPI.vaultClient.WriteKeyToKVStorage(string(ecKey), "notes/"+page.NotebookID+"/"+page.Metadata.ID); e != nil {
				return e
			}
		} else {
			return err
		}
		file.Close()
	} else {
		return err
	}
	return nil
}

//ReadPage ...
func (notesAPI *ServiceAPI) ReadPage(pageID, notebookID string) (string, error) {
	var entryKey crypto.Key
	var entryCryptoKey crypto.PageEncryptionKey
	if file, err := os.OpenFile("notebooks/"+notebookID+"/"+pageID, os.O_RDONLY, 0600); os.IsNotExist(err) {
		return "", err
	} else {
		if contentKey, err := notesAPI.vaultClient.ReadKeyFromKV("notes/" + notebookID + "/" + pageID); err == nil {
			data, _ := base64.StdEncoding.DecodeString(string(contentKey))
			common.LogError("", json.Unmarshal(data, &entryCryptoKey))
			if masterKey, err := notesAPI.vaultClient.UnsealKey("notebook", entryCryptoKey.SealedMasterKey, crypto.Context{"pageiD": pageID}); err == nil {
				entryKey.Unseal(masterKey[:], entryCryptoKey.EntryKey)
				decryptor, err := sio.DecryptReader(file, sio.Config{Key: entryKey[:], MinVersion: sio.Version20})
				fileContent, err := ioutil.ReadAll(decryptor)
				if err != nil {
					return "", err
				}
				return string(fileContent), err
			} else {
				return "", err
			}
		} else {
			return "", err
		}
	}
}

//DeletePage ...
func (notesAPI *ServiceAPI) DeletePage(pageID, notebookID string) error {
	if err := notesAPI.data.DeletePage(pageID); err == nil {
		wd, _ := os.Getwd()
		common.LogError("", os.Remove(wd+"/notebooks/"+notebookID+"/"+pageID))
		return notesAPI.vaultClient.DeleteKeyFromKV("notes/" + notebookID + "/" + pageID)
	} else {
		return err
	}
}

//NewNotebook ...
func (notesAPI *ServiceAPI) NewNotebook(notebook data.Notebook) error {
	if err := notesAPI.data.NewNotebook(notebook); err == nil {
		return os.Mkdir("notebooks/"+notebook.ID, 0600)
	} else {
		return err
	}
}

//DeleteNotebook ...
func (notesAPI *ServiceAPI) DeleteNotebook(id string) error {
	if err := notesAPI.data.DeleteNotebook(id); err == nil {
		wd, _ := os.Getwd()
		return os.RemoveAll(wd + "/notebooks/" + id)
	} else {
		return common.LogError("", err)
	}
}
