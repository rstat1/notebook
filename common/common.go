package common

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/json"
	"errors"
	"io/ioutil"
	"net/http"
	"regexp"
	"runtime"
	"strings"
	"time"

	"os"

	"github.com/sirupsen/logrus"
)

const ()

//APIResponse ...
type APIResponse struct {
	Status         string `json:"status"`
	Response       string `json:"response"`
	HttpStatusCode int    `json:"-"`
}

//LocalAppConfig ...
type LocalAppConfig struct {
	DBName              string `json:"database"`
	BaseURL             string `json:"baseURL"`
	TrinitySID          string `json:"sid"`
	TrinitySKey         string `json:"skey"`
	DBServerAddr        string `json:"dbServerAddr"`
	VaultKeyName        string `json:"vaultKey"`
	VaultEndpoint       string `json:"vaultAddr"`
	VaultAppRoleID      string `json:"vaultRole"`
	VaultBaseAuthToken  string `json:"baseToken"`
	FireBaseEndpointURL string `json:"firebaseEndpoint"`
}

var (
	DevMode            bool
	Logger             *logrus.Logger
	BaseURL            string
	BaseAPIURL         string
	BaseAuthURL        string
	CurrentConfig      LocalAppConfig
	currentProcessName string
)

//CreateAPIResponse ...
func CreateAPIResponse(response string, err error, failureCode int) APIResponse {
	if err == nil {
		return APIResponse{
			Status:         "success",
			Response:       response,
			HttpStatusCode: http.StatusOK,
		}
	} else {
		return APIResponse{
			Status:         "failed",
			Response:       err.Error(),
			HttpStatusCode: failureCode,
		}
	}
}

//WriteAPIResponseStruct ...
func WriteAPIResponseStruct(writer http.ResponseWriter, resp APIResponse) {
	writeCommonHeaders(writer)
	writer.WriteHeader(resp.HttpStatusCode)
	apiResp, _ := json.Marshal(resp)
	writer.Write([]byte(apiResp))
}

//CreateAPIRespFromObject ...
func CreateAPIRespFromObject(response interface{}, err error, failureCode int) APIResponse {
	rAsJSON, _ := json.Marshal(response)
	return CreateAPIResponse(string(rAsJSON), err, failureCode)
}

//WriteFailureResponse ..
func WriteFailureResponse(err error, resp http.ResponseWriter, functionName string, status int) {
	LogError("", err)
	WriteAPIResponseStruct(resp, CreateAPIResponse("failed", err, status))
}

//WriteResponse ...
func WriteResponse(respWriter http.ResponseWriter, failureCode int, resp interface{}, err error) {
	if err != nil {
		LogError("", err)
		WriteAPIResponseStruct(respWriter, CreateAPIResponse("failed", err, failureCode))
	} else {
		if resp == nil {
			WriteAPIResponseStruct(respWriter, CreateAPIResponse("success", nil, 200))
		} else {
			WriteAPIResponseStruct(respWriter, CreateAPIRespFromObject(resp, nil, 200))
		}
	}
}

//CreateFailureResponse ...
func CreateFailureResponse(err error, functionName string, status int) APIResponse {
	LogError("", err)
	return CreateAPIResponse("failed", err, status)
}

//CreateFailureResponseWithFields ...
func CreateFailureResponseWithFields(err error, status int, fields logrus.Fields) APIResponse {
	LogError("", err)
	return CreateAPIResponse("failed", err, status)
}

//ValidateRequest ...
func ValidateRequest(validator func(*http.Request) APIResponse, handler func(http.ResponseWriter, *http.Request)) http.HandlerFunc {
	return http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		if request.Method == "POST" && request.Header.Get("Content-Length") == "" {
			WriteAPIResponseStruct(writer, CreateAPIResponse("", errors.New("request body empty"), 400))
		} else {
			if resp := validator(request); resp.Status == "success" {
				handler(writer, request)
			} else {
				WriteAPIResponseStruct(writer, resp)
			}
		}
	})
}

//BasicAuthRequired Forces the requestor to collect a username/password combo via WWW-Auth
//The provided validator function should then take that combo and insure that it's a valid combo.
//Then we call the handler, to do whatever the handler does
func BasicAuthRequired(validator func(string, string) (bool, error), handler func(http.ResponseWriter, *http.Request)) http.Handler {
	return http.HandlerFunc(func(writer http.ResponseWriter, req *http.Request) {
		if authHeader := req.Header.Get("Authorization"); strings.Contains(authHeader, "Basic") == true {
			if success, err := validator(strings.Replace(authHeader, "Basic ", "", 1), req.Method); success {
				handler(writer, req)
			} else {
				if err != nil {
					http.Error(writer, err.Error(), http.StatusForbidden)
				} else {
					http.Error(writer, "cred validation failed", http.StatusForbidden)
				}
			}
		} else if req.URL.User != nil {
			password, exists := req.URL.User.Password()
			if exists {
				if success, err := validator(password, req.Method); success {
					handler(writer, req)
				} else {
					if err != nil {
						http.Error(writer, err.Error(), http.StatusForbidden)
					} else {
						http.Error(writer, "cred validation failed", http.StatusForbidden)
					}
				}
			} else {
				http.Error(writer, "failed", http.StatusForbidden)
			}
		} else {
			writer.Header().Add("WWW-Authenticate", "Basic realm="+`"devcentral"`)
			http.Error(writer, "Unauthorized", http.StatusUnauthorized)
		}
	})
}

//RequestWrapper ...
func RequestWrapper(validator func(*http.Request) APIResponse, validMethod string, handler func(http.ResponseWriter, *http.Request)) http.Handler {
	return http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		if (validMethod != "") && (request.Method != validMethod) {
			WriteAPIResponseStruct(writer, APIResponse{
				Status:         "failed",
				Response:       "method not allowed",
				HttpStatusCode: http.StatusMethodNotAllowed,
			})
		} else {
			if resp := validator(request); resp.Status == "success" {
				handler(writer, request)
			} else {
				WriteAPIResponseStruct(writer, resp)
			}
		}
	})
}

//ValidateRequestMethod ...
func ValidateRequestMethod(r *http.Request, validMethod string, writer http.ResponseWriter) bool {
	if r.Method != validMethod {
		WriteAPIResponseStruct(writer, APIResponse{
			Status:         "failed",
			Response:       "method not allowed",
			HttpStatusCode: http.StatusMethodNotAllowed,
		})
		return false
	} else {
		return true
	}
}
func writeCommonHeaders(writer http.ResponseWriter) {
	writer.Header().Add("Content-Type", "application/json")
}

func runAuthValidatorAndHandler() {}

//Nothing ...
func Nothing(r *http.Request) APIResponse {
	return CreateAPIResponse("success", nil, 200)
}

//InitLogrus ...
func InitLogrus() {
	Logger = logrus.New()
	Logger.Out = os.Stdout
	Logger.SetLevel(logrus.DebugLevel)
	currentProcessName = os.Args[0]
}

//LogError ...
func LogError(extra string, err error) error {
	if err != nil {
		pc, _, line, _ := runtime.Caller(1)
		funcObj := runtime.FuncForPC(pc)
		runtimeFunc := regexp.MustCompile(`^.*\.(.*)$`)
		name := runtimeFunc.ReplaceAllString(funcObj.Name(), "$1")

		if extra != "" {
			Logger.WithFields(logrus.Fields{"func": name, "line": line, "extra": extra}).Errorln(err)
		} else {
			Logger.WithFields(logrus.Fields{"func": name, "line": line}).Errorln(err)
		}
		return err
	}
	return nil
}

//LogDebug ...
func LogDebug(extraKey string, extraValue interface{}, entry interface{}) {
	pc, _, line, _ := runtime.Caller(1)
	funcObj := runtime.FuncForPC(pc)
	runtimeFunc := regexp.MustCompile(`^.*\.(.*)$`)
	name := runtimeFunc.ReplaceAllString(funcObj.Name(), "$1")

	if extraKey != "" {
		Logger.WithFields(logrus.Fields{extraKey: extraValue, "func": name, "line": line, "process": currentProcessName}).Debugln(entry)
	} else {
		Logger.WithFields(logrus.Fields{"func": name, "line": line, "process": currentProcessName}).Debugln(entry)
	}
}

//LogInfo ...
func LogInfo(extraKey string, extraValue interface{}, entry interface{}) {
	pc, _, line, _ := runtime.Caller(1)
	funcObj := runtime.FuncForPC(pc)
	runtimeFunc := regexp.MustCompile(`^.*\.(.*)$`)
	name := runtimeFunc.ReplaceAllString(funcObj.Name(), "$1")

	if extraKey != "" {
		Logger.WithFields(logrus.Fields{extraKey: extraValue, "func": name, "line": line, "process": currentProcessName}).Infoln(entry)
	} else {
		Logger.WithFields(logrus.Fields{"func": name, "line": line, "process": currentProcessName}).Infoln(entry)
	}
}

//LogWarn ...
func LogWarn(extraKey string, extraValue interface{}, entry interface{}) {
	pc, _, line, _ := runtime.Caller(1)
	funcObj := runtime.FuncForPC(pc)
	runtimeFunc := regexp.MustCompile(`^.*\.(.*)$`)
	name := runtimeFunc.ReplaceAllString(funcObj.Name(), "$1")
	if extraKey != "" {
		Logger.WithFields(logrus.Fields{"func": name, "line": line, extraKey: extraValue, "process": currentProcessName}).Warnln(entry)
	} else {
		Logger.WithFields(logrus.Fields{"func": name, "line": line, "process": currentProcessName}).Warnln(entry)
	}
}

//CommonProcessInit ...
func CommonProcessInit(dev, loadConfig bool) {
	InitLogrus()
	if os.Getenv("PWD") == "" {
		Logger.Warnln("pwd not set")
		os.Chdir("/webservices/devcentral")
	}
	if loadConfig {
		if file, err := ioutil.ReadFile("config.json"); err == nil {
			err = json.Unmarshal([]byte(file), &CurrentConfig)
			if err != nil {
				panic(err)
			}
		} else {
			// common.Logger.Errorln()
			panic(errors.New("Please create a config.json file with the devcentral service id and key from frost in it."))
		}
	}
	BaseURL = "." + CurrentConfig.BaseURL
	if dev {
		DevMode = true
		BaseAPIURL = "http://api" + "." + CurrentConfig.BaseURL
		BaseAuthURL = "http://trinity" + "." + CurrentConfig.BaseURL
	} else {
		DevMode = false
		BaseAPIURL = "https://api" + "." + CurrentConfig.BaseURL
		BaseAuthURL = "https://trinity" + "." + CurrentConfig.BaseURL
	}
	if sid, exists := os.LookupEnv("SID"); exists && sid != "" {
		CurrentConfig.TrinitySID = sid
	}

	if skey, exists := os.LookupEnv("SKEY"); exists && skey != "" {
		CurrentConfig.TrinitySKey = skey
	}
}

//UnsetVaultToken ...
func UnsetVaultToken() {
	CurrentConfig.VaultBaseAuthToken = ""
	config, _ := json.Marshal(CurrentConfig)
	ioutil.WriteFile("config.json", config, 0644)
}

//ToSHA256Bytes ...
func ToSHA256Bytes(input []byte) []byte {
	b := sha256.Sum256(input)
	return b[:]
}

//Contains returns true if "s" contains "e"
func Contains(s []string, e string) bool {
	for _, a := range s {
		if a == e {
			return true
		}
	}
	return false
}

//Remove removes "r" from "s" and returns the new "s"
func Remove(s []string, r string) []string {
	for i, v := range s {
		if v == r {
			return append(s[:i], s[i+1:]...)
		}
	}
	return s
}

//TimeTrack ...
//https://stackoverflow.com/questions/45766572
func TimeTrack(start time.Time) {
	if DevMode {
		elapsed := time.Since(start)
		pc, _, _, _ := runtime.Caller(1)
		funcObj := runtime.FuncForPC(pc)
		runtimeFunc := regexp.MustCompile(`^.*\.(.*)$`)
		name := runtimeFunc.ReplaceAllString(funcObj.Name(), "$1")
		Logger.WithFields(logrus.Fields{"elaspsed": elapsed, "func": name}).Debugln("done")
	}
}

//RandomID ...
//https://stackoverflow.com/questions/12771930
func RandomID(n int) string {
	const alphanum = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
	var bytes = make([]byte, n)
	rand.Read(bytes)
	for i, b := range bytes {
		bytes[i] = alphanum[b%byte(len(alphanum))]
	}
	return string(bytes)
}

//ConvertInterfaceArrToIntArr ...
func ConvertInterfaceArrToIntArr(from []interface{}) (to []int) {
	to = make([]int, len(from))
	for i, v := range from {
		to[i] = v.(int)
	}
	return to
}

//UnixTimestampInMS Returns a unix timestamp for the current time and date in milliseconds
func UnixTimestampInMS() int64 {
	return time.Now().UnixNano() / 1000000
}
