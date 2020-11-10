package api

import (
	"encoding/hex"
	"encoding/json"
	"errors"
	"io/ioutil"
	"net/http"
	"strings"

	"go.alargerobot.dev/notebook/common"
	"go.alargerobot.dev/notebook/crypto"
	"go.alargerobot.dev/notebook/data"
	"gopkg.in/square/go-jose.v2/jwt"
)

//Auth ...
type Auth struct {
	datastore   *data.DataStore
	vault       *crypto.VaultKMS
	knownScopes map[string]bool
}

//NewUserService ...
func NewUserService(db *data.DataStore, vaultClient *crypto.VaultKMS) *Auth {
	authSvc := &Auth{
		vault:       vaultClient,
		datastore:   db,
		knownScopes: make(map[string]bool),
	}

	authSvc.knownScopes["notebook"] = true
	authSvc.knownScopes["notebook:read"] = true
	authSvc.knownScopes["notebook:write"] = true
	authSvc.knownScopes["notebook:delete"] = true
	authSvc.knownScopes["notebook:create"] = true
	authSvc.knownScopes["tags"] = true
	authSvc.knownScopes["admin"] = true
	authSvc.knownScopes["admin:apikey"] = true

	return authSvc
}

//GetUserHeader Gets the Authorization header from the give request
func (u *Auth) GetUserHeader(request *http.Request) (bool, string) {
	UserHeader := request.Header.Get("Authorization")
	if len(UserHeader) > 7 && strings.EqualFold(UserHeader[0:6], "BEARER") {
		token := UserHeader[7:]
		return true, token
	}
	return false, ""
}

//AuthTokenProvided Used by the Request validator to allow/disallow access to an API based on the presence of a valid Authorization header in the given request.
func (u *Auth) AuthTokenProvided(r *http.Request) common.APIResponse {
	var success bool
	success, _ = u.GetUserHeader(r)
	if success == false {
		return common.CreateAPIResponse("", errors.New("no token provided"), 401)
	}
	return common.CreateAPIResponse("success", nil, 200)
}

//AnyTokenProvided Used by Request validators to allow/disallow access based on the presence of any valid token.
//Allows either a Trinity JWT or a standard API token.
func (u *Auth) AnyTokenProvided(r *http.Request) common.APIResponse {
	var tokenProvided bool
	if success, header := u.GetUserHeader(r); success {
		tokenProvided, _ = u.getTokenType(header)
	}
	if tokenProvided {
		return common.CreateAPIResponse("success", nil, 200)
	}
	return common.CreateAPIResponse("failed", errors.New("no token provided, or provided token was invalid"), 401)
}

//NotAnAPIKey Used by Request validators to disallow access to a route if the provided token is not a JWT from Trinity.
func (u *Auth) NotAnAPIKey(r *http.Request) common.APIResponse {
	if success, header := u.GetUserHeader(r); success {
		if validToken, tokenType := u.getTokenType(header); validToken && tokenType == "JWT" {
			return common.CreateAPIResponse("success", nil, 200)
		} else {
			if tokenType != "JWT" {
				return common.CreateAPIResponse("failed", errors.New("the provided token was not the correct type"), 403)
			}
			if validToken == false {
				return common.CreateAPIResponse("failed", errors.New("invalid token"), 401)
			}
		}
	}
	return common.CreateAPIResponse("failed", errors.New("no token was provided"), 401)
}

//ValidateAPIToken Checks that the provided token is valid and allowed to perform the provided action.
func (u *Auth) ValidateAPIToken(key, action string) (bool, error) {
	hashed := hex.EncodeToString(common.ToSHA256Bytes([]byte(key)))
	if key, err := u.datastore.GetAPIKey(hashed); err == nil {
		if key.Hash == hashed {
			isValid := strings.Contains(key.Scopes, action) && u.knownScopes[action] == true
			if isValid {
				return true, nil
			} else {
				return false, errors.New("unknown or missing scope")
			}
		} else {
			return false, errors.New("tokens don't match")
		}
	} else {
		return false, err
	}
}

//GetUsernameFromToken ...
func (u *Auth) GetUsernameFromToken(r *http.Request) (string, error) {
	if gotToken, token := u.GetUserHeader(r); gotToken {
		_, tokenType := u.getTokenType(token)
		if tokenType == "JWT" {
			accessLvl, err := u.getJWTAccess(token)
			if err == nil {
				return accessLvl.Username, nil
			} else {
				return "", err
			}
		} else if tokenType == "API" {
			accessLvl, err := u.getAPIKeyAccess(token)
			if err == nil {
				return accessLvl.Username, nil
			} else {
				return "", err
			}
		} else {
			return "", errors.New("provided token was invalid")
		}
	} else {
		return "", errors.New("no token provided, or provided token was invalid")
	}
}

//GetAccessLevelFromToken ...
func (u *Auth) GetAccessLevelFromToken(r *http.Request) (data.AccessLevel, error) {
	if gotToken, token := u.GetUserHeader(r); gotToken {
		_, tokenType := u.getTokenType(token)
		if tokenType == "JWT" {
			return u.getJWTAccess(token)
		} else if tokenType == "API" {
			return u.getAPIKeyAccess(token)
		} else {
			return data.AccessLevel{}, errors.New("provided token was invalid")
		}
	} else {
		return data.AccessLevel{}, errors.New("no token provided, or provided token was invalid")
	}
}

//HasPermission ...
func (u *Auth) HasPermission(r *http.Request, scope string) bool {
	if access, e := u.GetAccessLevelFromToken(r); e != nil {
		return false
	} else {
		if strings.Contains(scope, "notebook:") && common.Contains(access.Scopes, "notebook") {
			return true
		} else if strings.Contains(scope, "admin:") && common.Contains(access.Scopes, "admin") {
			return true
		}
		return common.Contains(access.Scopes, scope)
	}
}

func (u *Auth) getTokenType(token string) (validToken bool, tokenType string) {
	if _, err := jwt.ParseSigned(token); err == nil {
		validToken = true
		tokenType = "JWT"
	} else {
		hashedToken := hex.EncodeToString(common.ToSHA256Bytes([]byte(token)))
		if _, err := u.datastore.GetAPIKey(hashedToken); err == nil {
			validToken = true
			tokenType = "API"
		} else {
			common.Logger.Errorln(err)
		}
	}
	return validToken, tokenType
}

func (u *Auth) getJWTAccess(token string) (data.AccessLevel, error) {
	var user data.User
	var serviceResp common.APIResponse
	c := http.Client{}
	req, _ := http.NewRequest("GET", common.BaseAPIURL+"/trinity/user", nil)
	req.Header.Add("Authorization", "Bearer "+token)
	if httpResp, err := c.Do(req); err == nil && httpResp.StatusCode == 200 {
		if body, err := ioutil.ReadAll(httpResp.Body); err == nil {
			json.Unmarshal(body, &serviceResp)
			json.Unmarshal([]byte(serviceResp.Response), &user)
			lvl := data.AccessLevel{Username: user.Username}
			lvl.Scopes = []string{"notebook", "tags"}
			if user.Group == "root" {
				lvl.Scopes = append(lvl.Scopes, "admin")
			} else {
				lvl.Scopes = append(lvl.Scopes, "admin:apikey")
			}
			return lvl, nil
		} else {
			return data.AccessLevel{}, common.LogError("apiResp", err)
		}
	} else {
		return data.AccessLevel{}, err
	}
}
func (u *Auth) getAPIKeyAccess(token string) (data.AccessLevel, error) {
	hashedToken := hex.EncodeToString(common.ToSHA256Bytes([]byte(token)))
	if token, err := u.datastore.GetAPIKey(hashedToken); err == nil {
		return data.AccessLevel{
			Username: token.Creator,
			Scopes:   strings.Split(token.Scopes, ","),
		}, nil
	} else {
		return data.AccessLevel{}, err
	}
}
