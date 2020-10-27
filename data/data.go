package data

import (
	"context"
	"errors"

	"go.alargerobot.dev/notebook/common"
	"go.alargerobot.dev/notebook/crypto"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

//DataStore ...
type DataStore struct {
	Cache *CacheService
	mongo *mongo.Client
	db    *mongo.Database
	vault *crypto.VaultKMS
}

//NewDataStore ...
func NewDataStore(vault *crypto.VaultKMS) *DataStore {
	ds := &DataStore{vault: vault, Cache: NewCacheService()}
	if err := ds.ConnectToMongoDB(); err != nil {
		panic(err)
	}
	return ds
}

//ConnectToMongoDB ...
func (data *DataStore) ConnectToMongoDB() error {
	if user, pass, err := data.vault.GetDBCredentials(); err == nil {
		mongoURL := "mongodb://" + user + ":" + pass + "@" + common.CurrentConfig.DBServerAddr + "/" + common.CurrentConfig.DBName + "?authsource=" + common.CurrentConfig.DBName
		mongoClientOpts := options.Client().ApplyURI(mongoURL)
		if mongoClient, err := mongo.NewClient(mongoClientOpts); err == nil {
			if err = mongoClient.Connect(context.Background()); err != nil {
				return err
			}
			data.mongo = mongoClient
			data.db = data.mongo.Database(common.CurrentConfig.DBName, nil)
		} else {
			return err
		}
	}
	return nil
}

//NewDocument ...
func (data *DataStore) NewDocument(title, layout string, tags []int) (Document, error) {
	return Document{}, errors.New("Not implemented")
}

//NewTag ...
func (data *DataStore) NewTag(value string) (DocumentTag, error) {
	return DocumentTag{}, errors.New("Not implemented")
}

//AddTagsToDocument ...
func (data *DataStore) AddTagsToDocument(tags []int, docID int) error {
	return errors.New("Not Implemented")
}

//GetDocumentTags ...
func (data *DataStore) GetDocumentTags() ([]DocumentTag, error) {
	return nil, errors.New("Not Implemented")
}

//GetDocumentByID ...
func (data *DataStore) GetDocumentByID(id int) (Document, error) {
	return Document{}, errors.New("Not implemented")
}

//GetDocumentsWithTags Returns docrefs of docs matching the 'tag(s)' specified
func (data *DataStore) GetDocumentsWithTags(tags []int, limit int) ([]DocumentReference, error) {
	return nil, errors.New("Not Implemented")
}

//DeleteDocument Deletes the document with the ID specified. Also removes the ID from from the tagmap
func (data *DataStore) DeleteDocument(docID int) (bool, error) {
	return false, errors.New("Not Implemented")
}

//DeleteTag Deletes a tag that has no assigned docs. If this function is called on with a tagid that is in active use an error is returned.
func (data *DataStore) DeleteTag(tag int) (bool, error) {
	return false, errors.New("Not Implemented")
}

//UpdateDocTitle ...
func (data *DataStore) UpdateDocTitle(newTitle string, docID int) (bool, error) {
	return false, errors.New("Not Implemented")
}

//UpdateDocLayout ...
func (data *DataStore) UpdateDocLayout(newLayout string, docID int) (bool, error) {
	return false, errors.New("Not Implemented")
}

//GetAPIToken ...
func (data *DataStore) GetAPIToken(token string) (UserAPIToken, error) {
	// var apiToken UserAPIToken
	return UserAPIToken{}, errors.New("Not Implemented")
}

//GetAPITokens ...
func (data *DataStore) GetAPITokens(username string) ([]UserAPIToken, error) {
	// var apiTokens []UserAPIToken
	return nil, errors.New("Not Implemented")

}
