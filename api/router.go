package api

import (
	"context"
	"encoding/json"
	"io/ioutil"
	"net/http"
	"time"

	"github.com/husobee/vestigo"
	"go.alargerobot.dev/notebook/common"
	"go.alargerobot.dev/notebook/crypto"
	"go.alargerobot.dev/notebook/data"
)

//Routes ...
type Routes struct {
	http        *http.Client
	auth        *Auth
	data        *data.DataStore
	router      *vestigo.Router
	vaultClient *crypto.VaultKMS
	gql         *GraphQLResolver
}

//NewAPIRouter ...
func NewAPIRouter(dataStore *data.DataStore, routes *vestigo.Router, dev bool, vaultClient *crypto.VaultKMS) *Routes {
	gql := NewGQLResolver(dataStore)
	api := &Routes{
		gql:         gql,
		router:      routes,
		data:        dataStore,
		vaultClient: vaultClient,
		auth:        NewUserService(dataStore),
		http:        &http.Client{Timeout: time.Second * 2},
	}
	api.InitAPIRoutes()
	return api
}

//InitAPIRoutes ...
func (api *Routes) InitAPIRoutes() {
	api.router.Add("POST", "/api/ash/query", common.ValidateRequest(api.auth.AnyTokenProvided, api.query))
	api.router.Add("GET", "/api/ash/auth/token", common.ValidateRequest(common.Nothing, api.authcode))
}

func (api *Routes) query(resp http.ResponseWriter, request *http.Request) {
	defer common.TimeTrack(time.Now())
	queryHash := vestigo.Param(request, "queryhash")
	resp.Header().Add("content-type", "application/json")
	if queryHash != "" && api.data.Cache.DoesKeyExist("nbgqlcache", queryHash) {
		common.LogDebug("resptype", "cached", queryHash)
		resp.Write([]byte(api.data.Cache.GetString("nbgqlcache", queryHash)))
	} else {
		api.doQuery(resp, request)
	}
}
func (api *Routes) doQuery(resp http.ResponseWriter, request *http.Request) {
	var result string
	u, e := api.auth.GetAccessLevelFromToken(request)
	if e != nil {
		common.WriteFailureResponse(e, resp, "query", 500)
	} else {
		ctx := context.WithValue(context.Background(), "accesslevel", u)

		body, _ := ioutil.ReadAll(request.Body)
		q := map[string]interface{}{}
		if err := json.Unmarshal(body, &q); err == nil {
			query, _ := q["query"].(string)
			vars, _ := q["variables"].(map[string]interface{})
			queryType, _ := q["type"].(string)
			id, _ := q["queryHash"].(string)

			common.LogDebug("resptype", "not-cached", id)

			if queryType == "query" {
				result = api.gql.Server.Query(ctx, query, id, "query", vars, api.data.Cache)
			} else {
				result = api.gql.Server.Query(ctx, query, id, "mutation", vars, api.data.Cache)
			}
			resp.Write([]byte(result))
			ctx.Done()
		}
	}
}
func (api *Routes) authcode(resp http.ResponseWriter, request *http.Request) {
	var serviceResp common.APIResponse

	code := request.URL.Query().Get("code")
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
