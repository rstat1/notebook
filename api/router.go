package api

import (
	"encoding/json"
	"errors"
	"io/ioutil"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/husobee/vestigo"
	"go.alargerobot.dev/notebook/common"
	"go.alargerobot.dev/notebook/crypto"
	"go.alargerobot.dev/notebook/data"
	"go.alargerobot.dev/notebook/notebook"
)

//Routes ...
type Routes struct {
	http        *http.Client
	user        *Auth
	data        *data.DataStore
	router      *vestigo.Router
	vaultClient *crypto.VaultKMS
	notebookSvc *notebook.ServiceAPI
}

//NewAPIRouter ...
func NewAPIRouter(dataStore *data.DataStore, routes *vestigo.Router, dev bool, vaultClient *crypto.VaultKMS) *Routes {
	api := &Routes{
		router:      routes,
		data:        dataStore,
		vaultClient: vaultClient,
		user:        NewUserService(dataStore, vaultClient),
		http:        &http.Client{Timeout: time.Second * 2},
		notebookSvc: notebook.NewNBServiceAPI(dataStore, vaultClient),
	}
	api.InitAPIRoutes()
	return api
}

//InitAPIRoutes ...
func (api *Routes) InitAPIRoutes() {
	api.router.Handle("/api/ash/auth/token", common.RequestWrapper(common.Nothing, "GET", api.authcode))

	api.router.Handle("/api/ash/user/apikeys/:user", common.RequestWrapper(api.user.NotAnAPIKey, "POST", api.apikeys))
	api.router.Handle("/api/ash/user/apikey/new", common.RequestWrapper(api.user.NotAnAPIKey, "POST", api.newapikey))
	api.router.Handle("/api/ash/user/apikey", common.RequestWrapper(api.user.NotAnAPIKey, "DELETE", api.deleteapikey))

	api.router.Handle("/api/ash/notebooks", common.RequestWrapper(api.user.AnyTokenProvided, "GET", api.notebooks))

	api.router.Handle("/api/ash/notebook/new", common.RequestWrapper(api.user.AnyTokenProvided, "POST", api.newnotebook))
	api.router.Handle("/api/ash/notebook/:nbid", common.RequestWrapper(api.user.AnyTokenProvided, "GET", api.pages))
	api.router.Handle("/api/ash/notebook/:nbid/burn", common.RequestWrapper(api.user.AnyTokenProvided, "DELETE", api.deletenotebook))
	api.router.Handle("/api/ash/notebook/page", common.RequestWrapper(api.user.AnyTokenProvided, "POST", api.newpage))
	api.router.Handle("/api/ash/notebook/:nbid/page/:id", common.RequestWrapper(api.user.AnyTokenProvided, "GET", api.pagemetadata))
	api.router.Handle("/api/ash/notebook/:nbid/ripout/:id", common.RequestWrapper(api.user.AnyTokenProvided, "DELETE", api.ripout))
	api.router.Handle("/api/ash/notebook/:nbid/pagecontent/:id", common.RequestWrapper(api.user.AnyTokenProvided, "GET", api.page))
	api.router.Handle("/api/ash/notebook/:nbid/withtags", common.RequestWrapper(api.user.AnyTokenProvided, "POST", api.setfilter))

	api.router.Handle("/api/ash/tags", common.RequestWrapper(api.user.AnyTokenProvided, "GET", api.gettags))
	api.router.Handle("/api/ash/tags/new", common.RequestWrapper(api.user.AnyTokenProvided, "POST", api.newtag))
	api.router.Handle("/api/ash/tags/delete/:id", common.RequestWrapper(api.user.AnyTokenProvided, "DELETE", api.deletetag))
}

func (api *Routes) authcode(resp http.ResponseWriter, r *http.Request) {
	var serviceResp common.APIResponse

	code := r.URL.Query().Get("code")
	req, _ := http.NewRequest("GET", common.BaseAPIURL+"/trinity/token", nil)

	q := req.URL.Query()
	q.Set("sid", common.CurrentConfig.TrinitySID)
	q.Set("skey", common.CurrentConfig.TrinitySKey)
	q.Set("code", code)
	req.URL.RawQuery = q.Encode()
	if httpResp, err := api.http.Do(req); err == nil {
		if body, err := ioutil.ReadAll(httpResp.Body); err != nil {
			common.WriteFailureResponse(err, resp, "authcode", 500)
		} else {
			if e := json.Unmarshal(body, &serviceResp); e != nil {
				common.WriteFailureResponse(e, resp, "authcode", 500)
				return
			}
			if serviceResp.Status == "failed" {
				serviceResp.HttpStatusCode = 500
			} else {
				serviceResp.HttpStatusCode = 200
			}
			common.WriteAPIResponseStruct(resp, serviceResp)

		}
	} else {
		common.WriteFailureResponse(err, resp, "authcode", 500)
	}
}
func (api *Routes) apikeys(resp http.ResponseWriter, r *http.Request) {
	if api.user.HasPermission(r, "admin:apikey") {
		if username, err := api.user.GetUsernameFromToken(r); err == nil {
			keys, err := api.data.GetAPIKeys(username)
			if err != nil {
				common.WriteFailureResponse(err, resp, "apikeys", 400)
			} else {
				common.WriteAPIResponseStruct(resp, common.CreateAPIRespFromObject(keys, nil, 200))
			}
		} else {
			common.WriteFailureResponse(err, resp, "apikeys", 400)
		}
	} else {
		common.WriteFailureResponse(errors.New("not authorized"), resp, "apikeys", 401)
	}
}
func (api *Routes) newapikey(resp http.ResponseWriter, r *http.Request) {
	var keyDetails data.NewAPIKeyRequest
	if api.user.HasPermission(r, "admin:apikey") {
		body, _ := ioutil.ReadAll(r.Body)
		if err := json.Unmarshal(body, &keyDetails); err != nil {
			common.WriteFailureResponse(err, resp, "newapikey", 500)
			return
		}
		if username, err := api.user.GetUsernameFromToken(r); err == nil {
			keyDetails.Creator = username
			if newKeyResp, err := api.data.NewAPIKey(keyDetails); err == nil {
				common.WriteAPIResponseStruct(resp, common.CreateAPIRespFromObject(newKeyResp, nil, 500))
			} else {
				common.WriteFailureResponse(err, resp, "newapikey", 500)
			}
		} else {
			common.WriteFailureResponse(err, resp, "newapikey", 500)
		}
	} else {
		common.WriteFailureResponse(errors.New("not authorized"), resp, "newapikey", 401)
	}
}
func (api *Routes) deleteapikey(resp http.ResponseWriter, r *http.Request) {
	var delReq data.DeleteAPIKeyRequest
	if api.user.HasPermission(r, "admin:apikey") {
		body, _ := ioutil.ReadAll(r.Body)
		if err := json.Unmarshal(body, &delReq); err != nil {
			common.WriteFailureResponse(err, resp, "deleteapikey", 500)
			return
		}
		if username, err := api.user.GetUsernameFromToken(r); err == nil {
			if username != string(delReq.Creator) {
				common.WriteFailureResponse(errors.New("forbidden"), resp, "deleteapikey", 403)
			} else {
				api.data.DeleteAPIKey(delReq.ID)
			}
		} else {
			common.WriteFailureResponse(err, resp, "deleteapikey", 500)
		}
	} else {
		common.WriteFailureResponse(errors.New("not authorized"), resp, "deleteapikey", 401)
	}
}
func (api *Routes) notebooks(resp http.ResponseWriter, r *http.Request) {
	if api.user.HasPermission(r, "notebook:read") {
		if username, err := api.user.GetUsernameFromToken(r); err == nil {
			names, err := api.notebookSvc.GetNotebooks(username)
			common.WriteResponse(resp, 400, names, err)
		} else {
			common.WriteFailureResponse(err, resp, "notebooks", 500)
		}
	} else {
		common.WriteFailureResponse(errors.New("not authorized"), resp, "notebooks", 401)
	}
}
func (api *Routes) newnotebook(resp http.ResponseWriter, r *http.Request) {
	if api.user.HasPermission(r, "notebook:create") {
		if username, err := api.user.GetUsernameFromToken(r); err == nil {
			notebookName, err := ioutil.ReadAll(r.Body)
			if err != nil {
				common.WriteFailureResponse(err, resp, "newnotebook", 500)
				return
			}
			if string(notebookName) == "" {
				common.WriteFailureResponse(errors.New("you can't have a nameless notebook"), resp, "newnotebook", 400)
			} else {
				ref, err := api.notebookSvc.NewNotebook(data.Notebook{
					Name:  string(notebookName),
					ID:    strings.TrimSpace(uuid.New().String()),
					Owner: strings.TrimSpace(username),
					Pages: []data.Page{},
				})
				common.WriteResponse(resp, 400, ref, err)
			}
		} else {
			common.WriteFailureResponse(err, resp, "newnotebook", 500)
		}
	} else {
		common.WriteFailureResponse(errors.New("not authorized"), resp, "newnotebook", 401)
	}
}

func (api *Routes) pages(resp http.ResponseWriter, r *http.Request) {
	if api.user.HasPermission(r, "notebook:read") {
		pages, err := api.notebookSvc.GetPages(vestigo.Param(r, "nbid"))
		common.WriteResponse(resp, 400, pages, err)
	} else {
		common.WriteFailureResponse(errors.New("not authorized"), resp, "pages", 401)
	}
}
func (api *Routes) deletenotebook(resp http.ResponseWriter, r *http.Request) {
	if api.user.HasPermission(r, "notebook:delete") {
		common.WriteResponse(resp, 400, nil, api.notebookSvc.DeleteNotebook(vestigo.Param(r, "nbid")))
	} else {
		common.WriteFailureResponse(errors.New("not authorized"), resp, "deletenotebook", 401)
	}
}
func (api *Routes) newpage(resp http.ResponseWriter, r *http.Request) {
	var newPage data.NewPageRequest
	if api.user.HasPermission(r, "notebook:create") {
		if err := r.ParseMultipartForm(128 * 1024); err == nil {
			metadata := r.FormValue("metadata")
			pageContent := r.FormValue("content")
			if err := json.Unmarshal([]byte(metadata), &newPage); err != nil {
				common.WriteFailureResponse(err, resp, "newpage", 500)
				return
			}
			newPage.Content = pageContent
		} else {
			common.WriteFailureResponse(err, resp, "newpage", 500)
			return
		}

		if username, err := api.user.GetUsernameFromToken(r); err == nil {
			newPage.Metadata.Creator = username
			newPage.Metadata.ID = uuid.New().String()
			common.WriteResponse(resp, 400, newPage.Metadata, api.notebookSvc.NewPage(newPage))
		} else {
			common.WriteFailureResponse(err, resp, "newpage", 400)
		}

	} else {
		common.WriteFailureResponse(errors.New("not authorized"), resp, "newpage", 401)
	}
}
func (api *Routes) pagemetadata(resp http.ResponseWriter, r *http.Request) {
	if api.user.HasPermission(r, "notebook:read") {
		if allowed, err := api.isAccessAllowed(r); allowed {
			page, err := api.notebookSvc.GetPageMetadata(vestigo.Param(r, "id"))
			common.WriteResponse(resp, 400, page, err)
		} else {
			if err != nil {
				common.WriteFailureResponse(err, resp, "pagemetada", 500)
			} else {
				common.WriteFailureResponse(errors.New("not authorized"), resp, "pagemetada", 401)
			}
		}
	} else {
		common.WriteFailureResponse(errors.New("not authorized"), resp, "pagemetadata", 401)
	}
}
func (api *Routes) ripout(resp http.ResponseWriter, r *http.Request) {
	if api.user.HasPermission(r, "notebook:delete") {
		common.WriteResponse(resp, 400, nil, api.notebookSvc.DeletePage(vestigo.Param(r, "id"), vestigo.Param(r, "nbid")))
	} else {
		common.WriteFailureResponse(errors.New("not authorized"), resp, "ripout", 401)
	}
}
func (api *Routes) page(resp http.ResponseWriter, r *http.Request) {
	if api.user.HasPermission(r, "notebook:read") {
		if allowed, err := api.isAccessAllowed(r); allowed {
			page, err := api.notebookSvc.ReadPage(vestigo.Param(r, "id"), vestigo.Param(r, "nbid"))
			common.WriteResponse(resp, 400, page, err)
		} else {
			if err != nil {
				common.WriteFailureResponse(err, resp, "page", 500)
			} else {
				common.WriteFailureResponse(errors.New("not authorized"), resp, "pagemetada", 401)
			}
		}
	} else {
		common.WriteFailureResponse(errors.New("not authorized"), resp, "pagemetadata", 401)
	}
}
func (api *Routes) setfilter(resp http.ResponseWriter, r *http.Request) {
	var tagList []string
	if api.user.HasPermission(r, "notebook:read") {
		body, _ := ioutil.ReadAll(r.Body)
		if err := json.Unmarshal(body, &tagList); err != nil {
			common.WriteFailureResponse(err, resp, "newpage", 500)
			return
		}
		pages, err := api.data.GetPagesWithTags(tagList, vestigo.Param(r, "nbid"))
		common.WriteResponse(resp, 500, pages, err)
	} else {
		common.WriteFailureResponse(errors.New("not authorized"), resp, "pagemetadata", 401)
	}
}
func (api *Routes) gettags(resp http.ResponseWriter, r *http.Request) {
	if api.user.HasPermission(r, "tags") {
		tags, err := api.data.GetTags()
		common.WriteResponse(resp, 400, tags, err)
	} else {
		common.WriteFailureResponse(errors.New("not authorized"), resp, "newtag", 401)
	}
}
func (api *Routes) newtag(resp http.ResponseWriter, r *http.Request) {
	if api.user.HasPermission(r, "tags") {
		body, _ := ioutil.ReadAll(r.Body)
		if username, err := api.user.GetUsernameFromToken(r); err == nil {
			common.WriteResponse(resp, 400, nil, api.data.NewTag(data.PageTag{TagID: uuid.New().String(), TagValue: string(body), Creator: username}))
		} else {
			common.WriteFailureResponse(err, resp, "newpage", 400)
		}
	} else {
		common.WriteFailureResponse(errors.New("not authorized"), resp, "newtag", 401)
	}
}
func (api *Routes) deletetag(resp http.ResponseWriter, r *http.Request) {
	if api.user.HasPermission(r, "tags") {
		common.WriteResponse(resp, 400, nil, api.data.DeleteTag(vestigo.Param(r, "id")))
	} else {
		common.WriteFailureResponse(errors.New("not authorized"), resp, "newtag", 401)
	}
}
func (api *Routes) isAccessAllowed(r *http.Request) (bool, error) {
	if username, err := api.user.GetUsernameFromToken(r); err == nil {
		if creator, err := api.data.GetPageCreator(vestigo.Param(r, "id")); err == nil {
			if creator == username {
				return true, nil
			} else {
				return false, nil
			}
		} else {
			common.LogError("", err)
			return false, err
		}
	} else {
		common.LogError("", err)
		return false, err
	}
}
