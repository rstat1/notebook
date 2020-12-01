package notebook

import (
	"encoding/json"
	"errors"
	"io/ioutil"
	"os"

	"github.com/minio/sio"
	"go.alargerobot.dev/notebook/common"
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
		err := os.Mkdir("notebooks", 0700)
		if err != nil {
			panic(err)
		}
	}
	return &ServiceAPI{data: db, vaultClient: vault}
}

//GetPages ...
func (notesAPI *ServiceAPI) GetPages(notebookID, user string) ([]data.Page, error) {
	return notesAPI.data.GetContentsOfNotebook(notebookID, user)
}

//GetPageMetadata ...
func (notesAPI *ServiceAPI) GetPageMetadata(pageID, notebookID string) (data.Page, error) {
	return notesAPI.data.GetPageByID(pageID, notebookID)
}

//GetNotebooks ...
func (notesAPI *ServiceAPI) GetNotebooks(username string) ([]data.NotebookReference, error) {
	return notesAPI.data.GetUserNotebookNames(username)
}

//NewPage ...
func (notesAPI *ServiceAPI) NewPage(page data.NewPageRequest) error {
	if valid, e := notesAPI.data.IsValidTagID(page.Metadata.Tags, page.Metadata.Creator); e != nil {
		return common.LogError("", e)
	} else if valid == false {
		return common.LogError("data.IsValidTagID", errors.New("One or more of the specified tags is invalid"))
	}

	if err := notesAPI.writePageContentToDisk(page.Content, page.Metadata.ID, page.NotebookID); err != nil {
		return common.LogError("writePageContentToDisk", err)
	}

	if err := notesAPI.data.NewPage(page.Metadata, page.NotebookID); err != nil {
		notesAPI.cleanupAfterError(page.Metadata.ID, page.NotebookID)
		return err
	}

	return nil
}

//ReadPage ...
func (notesAPI *ServiceAPI) ReadPage(pageID, notebookID string) (string, error) {
	var entryKey crypto.Key
	var entryCryptoKey crypto.PageEncryptionKey
	if file, err := os.OpenFile("notebooks/"+notebookID+"/"+pageID, os.O_RDONLY, 0700); os.IsNotExist(err) {
		return "", err
	} else {
		if contentKey, err := notesAPI.vaultClient.ReadKeyFromKV(notebookID + "/" + pageID); err == nil {
			common.LogError("", json.Unmarshal([]byte(contentKey), &entryCryptoKey))
			if masterKey, err := notesAPI.vaultClient.UnsealKey(entryCryptoKey.SealedMasterKey, crypto.Context{"pageiD": pageID}); err == nil {
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
	if err := notesAPI.data.DeletePage(pageID, notebookID); err == nil {
		wd, _ := os.Getwd()
		common.LogError("", os.Remove(wd+"/notebooks/"+notebookID+"/"+pageID))
		return notesAPI.vaultClient.DeleteKeyFromKV(notebookID + "/" + pageID)
	} else {
		return common.LogError("", err)
	}
}

//EditPageMD ...
func (notesAPI *ServiceAPI) EditPageMD(pageMD data.NewPageRequest) error {
	if pageMD.Metadata.ID == "" {
		return errors.New("missing required id")
	}

	updated, err := notesAPI.data.UpdatePage(pageMD.NotebookID, pageMD.Metadata)
	if !updated {
		return errors.New("couldn't find a page to update")
	}
	return err
}

//EditPageContent ...
func (notesAPI *ServiceAPI) EditPageContent(content, pageID, notebookID string) error {
	pageMD, err := notesAPI.GetPageMetadata(pageID, notebookID)
	if err != nil {
		return err
	}
	if _, err := notesAPI.data.UpdatePage(notebookID, pageMD); err != nil {
		return err
	}

	return notesAPI.writePageContentToDisk(content, pageID, notebookID)
}

//NewNotebook ...
func (notesAPI *ServiceAPI) NewNotebook(notebook data.Notebook) (data.NotebookReference, error) {
	if err := notesAPI.data.NewNotebook(notebook); err == nil {
		return data.NotebookReference{ID: notebook.ID, Name: notebook.Name}, os.Mkdir("notebooks/"+notebook.ID, 0700)
	} else {
		return data.NotebookReference{}, err
	}
}

//DeleteNotebook ...
func (notesAPI *ServiceAPI) DeleteNotebook(id string) error {
	//TODO: Delete vault keys too.
	if pages, err := notesAPI.data.DeleteNotebook(id); err == nil {
		wd, _ := os.Getwd()

		for _, pageRef := range pages {
			err = notesAPI.vaultClient.DeleteKeyFromKV(id + "/" + pageRef.ID)
			if err != nil {
				return common.LogError("", err)
			}
		}
		return os.RemoveAll(wd + "/notebooks/" + id)
	} else {
		return common.LogError("", err)
	}
}

func (notesAPI *ServiceAPI) writePageContentToDisk(content, pageID, notebookID string) error {
	wd, _ := os.Getwd()
	path := wd + "/notebooks/" + notebookID + "/" + pageID

	if notebookID == "" {
		return errors.New("no notebook id specified")
	}

	if err := notesAPI.renameFileForEdit(path); err != nil {
		return err
	}

	if vKey, vSealed, err := notesAPI.vaultClient.GenerateKey(crypto.Context{"pageID": pageID}); err == nil {
		cryptoKey := crypto.GenerateKey(vKey[:], "notes/"+notebookID+"/"+pageID)
		sealed, _ := cryptoKey.Seal(vKey[:], notebookID+"/"+pageID)
		file, err := os.OpenFile(path, os.O_CREATE|os.O_WRONLY, 0700)
		if err != nil {
			notesAPI.revertFileRename(path)
			return common.LogError("", err)
		}
		if encryptedWriter, err := sio.EncryptWriter(file, sio.Config{Key: cryptoKey[:], MinVersion: sio.Version20}); err == nil {
			encryptedWriter.Write([]byte(content))
			if err = encryptedWriter.Close(); err != nil {
				os.Remove(path)
				file.Close()
				notesAPI.revertFileRename(path)
				return common.LogError("", err)
			}
			entryCryptoKey := crypto.PageEncryptionKey{EntryKey: sealed, SealedMasterKey: vSealed}
			ecKey, _ := json.Marshal(entryCryptoKey)
			if e := notesAPI.vaultClient.WriteKeyToKVStorage(string(ecKey), notebookID+"/"+pageID); e != nil {
				file.Close()
				os.Remove(path)
				notesAPI.revertFileRename(path)
				return common.LogError("", e)
			}
		} else {
			notesAPI.revertFileRename(path)
			return common.LogError("", err)
		}
		file.Close()
	} else {
		notesAPI.revertFileRename(path)
		return common.LogError("", err)
	}

	if _, err := os.Stat(path + "-backup"); !os.IsNotExist(err) {
		if err := os.Remove(path + "-backup"); err != nil {
			return common.LogError("", err)
		}
	}

	return nil
}

func (notesAPI *ServiceAPI) cleanupAfterError(pageID, notebookID string) {
	wd, _ := os.Getwd()
	path := wd + "/notebooks/" + notebookID + "/" + pageID
	os.RemoveAll(path)
	notesAPI.vaultClient.DeleteKeyFromKV(notebookID + "/" + pageID)
}

func (notesAPI *ServiceAPI) renameFileForEdit(path string) error {
	if _, err := os.Stat(path); !os.IsNotExist(err) {
		if err := os.Rename(path, path+"-backup"); err != nil {
			return err
		}
	}
	return nil
}

func (notesAPI *ServiceAPI) revertFileRename(path string) error {
	if _, err := os.Stat(path + "-backup"); !os.IsNotExist(err) {
		if err := os.Rename(path+"-backup", path); err != nil {
			return err
		}
	}
	return nil
}
