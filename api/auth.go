package api

import (
	"encoding/hex"
	"encoding/json"
	"errors"
	"io/ioutil"
	"net/http"
	"strings"

	"go.alargerobot.dev/notebook/common"
	"go.alargerobot.dev/notebook/data"
	"gopkg.in/square/go-jose.v2/jwt"
)

type Auth struct {
	datastore      *data.DataStore
	requiredScopes map[string]string
}

//NewUserService ...
func NewUserService(db *data.DataStore) *Auth {
	return &Auth{
		datastore:      db,
		requiredScopes: make(map[string]string),
		// config:    configService,
	}
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

//ValidateAPIToken Checks that the provided token is valid and allowed to perform the provided action.
func (u *Auth) ValidateAPIToken(token, action string) (bool, error) {
	hashedToken := hex.EncodeToString(common.ToSHA256Bytes([]byte(token)))
	if token, err := u.datastore.GetAPIToken(hashedToken); err == nil {
		if token.TokenHash == hashedToken {
			switch action {
			case "api":
				return strings.Contains(token.Scopes, "api"), nil
			case "admin_api":
				return strings.Contains(token.Scopes, "admin_api"), nil
			default:
				return false, errors.New("unknown scope: " + action)
			}
		} else {
			return false, errors.New("tokens don't match")
		}
	} else {
		return false, err
	}
}

//GetAccessLevelFromToken ...
func (u *Auth) GetAccessLevelFromToken(r *http.Request) (data.AccessLevel, error) {
	if gotToken, token := u.GetUserHeader(r); gotToken {
		_, tokenType := u.getTokenType(token)
		if tokenType == "JWT" {
			return u.getJWTAccess(token)
		} else if tokenType == "API" {
			return u.getAPITokenAccess(token)
		} else {
			return data.AccessLevel{}, errors.New("provided token was invalid")
		}
	} else {
		return data.AccessLevel{}, errors.New("no token provided, or provided token was invalid")
	}
}
func (u *Auth) getTokenType(token string) (validToken bool, tokenType string) {
	if _, err := jwt.ParseSigned(token); err == nil {
		validToken = true
		tokenType = "JWT"
	} else {
		if _, err := u.ValidateAPIToken(token, "api"); err == nil {
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
	if httpResp, err := c.Do(req); err == nil {
		if body, err := ioutil.ReadAll(httpResp.Body); err == nil {
			if e := json.Unmarshal(body, &serviceResp); err == nil {
				if e = json.Unmarshal([]byte(serviceResp.Response), &user); err == nil {
					lvl := data.AccessLevel{
						Username: user.Username,
					}
					lvl.Scopes = []string{"api", "read_repo", "write_repo"}
					if user.Group == "root" {
						lvl.Scopes = append(lvl.Scopes, "admin_api")
					}
					return lvl, nil
				}
				common.Logger.WithField("func", "GetUserFromToken(user)").Errorln(e)
				return data.AccessLevel{}, err
			} else {
				return data.AccessLevel{}, err
			}
		} else {
			common.Logger.WithField("func", "GetUserFromToken(apiResp)").Errorln(err)
			return data.AccessLevel{}, err
		}
	} else {
		return data.AccessLevel{}, err
	}
}
func (u *Auth) getAPITokenAccess(token string) (data.AccessLevel, error) {
	hashedToken := hex.EncodeToString(common.ToSHA256Bytes([]byte(token)))
	if token, err := u.datastore.GetAPIToken(hashedToken); err == nil {
		return data.AccessLevel{
			Username: token.Creator,
			Scopes:   strings.Split(token.Scopes, ","),
		}, nil
	} else {
		return data.AccessLevel{}, err
	}
}
