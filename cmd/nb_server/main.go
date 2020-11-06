package main

import (
	"errors"
	"flag"
	"net/http"
	"os"

	"github.com/husobee/vestigo"
	"go.alargerobot.dev/notebook/api"
	"go.alargerobot.dev/notebook/common"
	"go.alargerobot.dev/notebook/crypto"
	"go.alargerobot.dev/notebook/data"
)

func main() {
	local := flag.Bool("local", false, "")
	dev := flag.Bool("devmode", false, "")
	ppid := flag.Int("ppid", -1, "")
	flag.Parse()

	common.CommonProcessInit(*dev, true)

	common.LogInfo("", "", "staring notebook service....")
	if os.Getppid() != *ppid && !*local {
		common.LogError("", errors.New("not running under watchdog"))
	}

	router := vestigo.NewRouter()
	router.SetGlobalCors(&vestigo.CorsAccessControl{
		AllowMethods: []string{"GET", "POST", "DELETE", "OPTIONS", "PUT"},
		AllowHeaders: []string{"Authorization", "Cache-Control", "X-Requested-With", "Content-Type"},
		AllowOrigin:  []string{"https://notebook" + common.BaseURL, "http://notebook" + common.BaseURL, "http://192.168.1.12:4200", "http://localhost:4200"},
	})

	kms := crypto.NewVaultKMS(*dev)

	api.NewAPIRouter(data.NewDataStore(kms), router, *dev, kms)

	if err := http.ListenAndServe("localhost:1013", router); err != nil {
		common.LogError("", err)
	}
}
