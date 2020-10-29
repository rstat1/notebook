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
	return &ServiceAPI{data: db, vaultClient: vault}
}

//GetPages ...
func (notesAPI *ServiceAPI) GetPages(notebookID string) ([]data.PageReference, error) {
	return notesAPI.data.GetContentsOfNotebook(notebookID)
}

//GetPage ...
func (notesAPI *ServiceAPI) GetPage(pageID string) (data.Page, error) {
	return notesAPI.GetPage(pageID)
}

//GetNotebooks ...
func (notesAPI *ServiceAPI) GetNotebooks(username string) ([]string, error) {
	return notesAPI.data.GetUserNotebookNames(username)
}

//NewPage ...
func (notesAPI *ServiceAPI) NewPage(page data.NewPageRequest) error {
	content, err := base64.StdEncoding.DecodeString(page.ContentAsBase64)
	if err != nil {
		return err
	}
	cipherText, err := notesAPI.vaultClient.Encrypt(string(content))
	if err != nil {
		return err
	}

	if err := notesAPI.data.NewPage(page.Metadata, page.NotebookID); err != nil {
		return err
	}

	return ioutil.WriteFile(page.NotebookID+"/"+page.Metadata.ID, []byte(cipherText), 0600)
}

//NewNotebook ...
func (notesAPI *ServiceAPI) NewNotebook(notebook data.Notebook) error {
	if err := notesAPI.data.NewNotebook(notebook); err == nil {
		return os.Mkdir(notebook.ID, 0600)
	} else {
		return err
	}
}

//DeleteNotebook ...
func (notesAPI *ServiceAPI) DeleteNotebook(id string) error {
	if err := notesAPI.data.DeleteNotebook(id); err == nil {

	}
	return nil
}
