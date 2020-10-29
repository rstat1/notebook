package api

import (
	"encoding/json"
	"errors"
	"io/ioutil"
	"net/http"
	"time"

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
	api.router.Handle("/api/ash/user/token", common.RequestWrapper(common.Nothing, "GET", api.authcode))

	api.router.Handle("/api/ash/user/apikeys/:user", common.RequestWrapper(api.user.NotAnAPIKey, "POST", api.apikeys))

	api.router.Handle("/api/ash/user/apikey/new", common.RequestWrapper(api.user.NotAnAPIKey, "POST", api.newapikey))
	api.router.Handle("/api/ash/user/apikey", common.RequestWrapper(api.user.NotAnAPIKey, "DELETE", api.deleteapikey))

	api.router.Handle("/api/ash/notebook/:nbid", common.RequestWrapper(api.user.AnyTokenProvided, "GET", api.pages))
	api.router.Handle("/api/ash/notebook/:nbid/page", common.RequestWrapper(api.user.AnyTokenProvided, "POST", api.newpage))
	api.router.Handle("/api/ash/notebook/page/:id", common.RequestWrapper(api.user.AnyTokenProvided, "GET", api.page))
	api.router.Handle("/api/ash/notebook/page/:id/ripout", common.RequestWrapper(api.user.AnyTokenProvided, "DELETE", api.ripout))

	api.router.Handle("/api/ash/notebooks", common.RequestWrapper(api.user.AnyTokenProvided, "GET", api.notebooks))
	api.router.Handle("/api/ash/notebook/new", common.RequestWrapper(api.user.AnyTokenProvided, "POST", api.newnotebook))
	api.router.Handle("/api/ash/notebook/:nbid/burn", common.RequestWrapper(api.user.AnyTokenProvided, "DELETE", api.deletenotebook))
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
			common.WriteFailureResponse(err, resp, "getToken", 500)
		} else {
			if e := json.Unmarshal(body, &serviceResp); e != nil {
				common.WriteFailureResponse(e, resp, "getToken", 500)
			} else {
				if serviceResp.Status == "failed" {
					serviceResp.HttpStatusCode = 500
				} else {
					serviceResp.HttpStatusCode = 200
				}
				common.WriteAPIResponseStruct(resp, serviceResp)
			}
		}
	} else {
		common.WriteFailureResponse(err, resp, "getToken", 500)
	}
}
func (api *Routes) apikeys(resp http.ResponseWriter, r *http.Request) {
	if api.user.HasPermission(r, "admin:apikey") {
		body, _ := ioutil.ReadAll(r.Body)
		if username, err := api.user.GetUsernameFromToken(r); err == nil {
			if username != string(body) {
				common.WriteFailureResponse(errors.New("forbidden"), resp, "apikeys", 403)
			} else {
				keys, err := api.data.GetAPIKeys(username)
				if err != nil {
					common.WriteFailureResponse(err, resp, "apikeys", 400)
				} else {
					common.WriteAPIResponseStruct(resp, common.CreateAPIRespFromObject(keys, nil, 200))
				}
			}
		} else {
			common.WriteFailureResponse(err, resp, "apikeys", 400)
		}
	} else {
		common.WriteFailureResponse(errors.New("not authorized"), resp, "newapikey", 401)
	}
}
func (api *Routes) newapikey(resp http.ResponseWriter, r *http.Request) {
	var keyDetails data.UserAPIKey
	if api.user.HasPermission(r, "admin:apikey") {
		body, _ := ioutil.ReadAll(r.Body)
		json.Unmarshal(body, &keyDetails)
		if newKeyResp, err := api.data.NewAPIKey(keyDetails); err == nil {
			common.WriteAPIResponseStruct(resp, common.CreateAPIRespFromObject(newKeyResp, nil, 500))
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
		json.Unmarshal(body, &delReq)
		if username, err := api.user.GetUsernameFromToken(r); err == nil {
			if username != string(delReq.Creator) {
				common.WriteFailureResponse(errors.New("forbidden"), resp, "apikeys", 403)
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
func (api *Routes) pages(resp http.ResponseWriter, r *http.Request) {
	if api.user.HasPermission(r, "notebook:read") {
		pages, err := api.notebookSvc.GetPages(r.URL.Query().Get("nbid"))
		common.WriteResponse(resp, 400, pages, err)
	} else {
		common.WriteFailureResponse(errors.New("not authorized"), resp, "newapikey", 401)
	}
}
func (api *Routes) newpage(resp http.ResponseWriter, r *http.Request) {
	var newPage data.NewPageRequest
	if api.user.HasPermission(r, "notebook:create") {
		body, _ := ioutil.ReadAll(r.Body)
		json.Unmarshal(body, &newPage)
		common.WriteResponse(resp, 400, nil, api.notebookSvc.NewPage(newPage))
	} else {
		common.WriteFailureResponse(errors.New("not authorized"), resp, "newapikey", 401)
	}
}
func (api *Routes) page(resp http.ResponseWriter, r *http.Request) {
	if api.user.HasPermission(r, "notebook:read") {
		page, err := api.notebookSvc.GetPage(r.URL.Query().Get("id"))
		common.WriteResponse(resp, 400, page, err)
	} else {
		common.WriteFailureResponse(errors.New("not authorized"), resp, "newapikey", 401)
	}
}
func (api *Routes) ripout(resp http.ResponseWriter, r *http.Request) {
	if api.user.HasPermission(r, "notebook:delete") {
		common.WriteResponse(resp, 400, nil, api.data.DeletePage(r.URL.Query().Get("id")))
	} else {
		common.WriteFailureResponse(errors.New("not authorized"), resp, "newapikey", 401)
	}
}
func (api *Routes) notebooks(resp http.ResponseWriter, r *http.Request) {
	if api.user.HasPermission(r, "notebook:read") {
		if username, err := api.user.GetUsernameFromToken(r); err == nil {
			names, err := api.notebookSvc.GetNotebooks(username)
			common.WriteResponse(resp, 400, names, err)
		} else {
			common.WriteFailureResponse(err, resp, "deleteapikey", 500)
		}
	} else {
		common.WriteFailureResponse(errors.New("not authorized"), resp, "newapikey", 401)
	}
}
func (api *Routes) newnotebook(resp http.ResponseWriter, r *http.Request) {
	var notebook data.Notebook
	if api.user.HasPermission(r, "notebook:create") {
		body, _ := ioutil.ReadAll(r.Body)
		json.Unmarshal(body, &notebook)
		common.WriteResponse(resp, 400, nil, api.notebookSvc.NewNotebook(notebook))
	} else {
		common.WriteFailureResponse(errors.New("not authorized"), resp, "newapikey", 401)
	}
}
func (api *Routes) deletenotebook(resp http.ResponseWriter, r *http.Request) {
	if api.user.HasPermission(r, "notebook:delete") {
		common.WriteResponse(resp, 400, nil, api.data.DeleteNotebook(r.URL.Query().Get("id")))
	} else {
		common.WriteFailureResponse(errors.New("not authorized"), resp, "newapikey", 401)
	}
}
