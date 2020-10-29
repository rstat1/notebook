package data

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"time"

	"github.com/google/uuid"
	"go.alargerobot.dev/notebook/common"
	"go.alargerobot.dev/notebook/crypto"
	"go.mongodb.org/mongo-driver/bson"
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

//NewPage ...
func (data *DataStore) NewPage(page Page, notebookID string) error {
	if _, err := data.insertUniqueItem("pages", page, bson.M{"title": page.Title}); err == nil {
		r, err := data.db.Collection("notebooks", nil).UpdateOne(context.Background(), bson.M{"id": notebookID}, bson.M{"$push": bson.M{"pages": page.ID}}, &options.UpdateOptions{})
		if r.ModifiedCount == 0 && err == nil {
			return errors.New("not modified")
		} else if r.MatchedCount == 0 && err == nil {
			return errors.New("not found")
		} else if err != nil {
			return err
		} else {
			return nil
		}
	} else {
		return err
	}
}

//NewTag ...
func (data *DataStore) NewTag(tag PageTag) error {
	_, err := data.insertUniqueItem("tags", tag, bson.M{"tagValue": tag.TagValue})
	return err
}

//NewNotebook ...
func (data *DataStore) NewNotebook(notebook Notebook) error {
	_, err := data.insertUniqueItem("notebooks", notebook, bson.M{"name": notebook.Name})
	return err
}

//NewAPIKey ...
func (data *DataStore) NewAPIKey(apiKey UserAPIKey) (key NewAPIKeyResponse, err error) {
	var b [20]byte

	newT := time.Now().Format("Jan 2, 2006")
	if _, err := rand.Read(b[:]); err != nil {
		common.LogError("", err)
		return NewAPIKeyResponse{}, err
	}
	t := hex.EncodeToString(b[:])

	apiKey.ID = uuid.New().String()
	apiKey.CreatedAt = newT
	apiKey.Hash = hex.EncodeToString(common.ToSHA256Bytes([]byte(t)))

	if success, err := data.insertItem("apikeys", apiKey); success {
		return NewAPIKeyResponse{Key: string(t)}, nil
	} else {
		return NewAPIKeyResponse{}, err
	}
}

//AddTagToPage ...
func (data *DataStore) AddTagToPage(tag string, pageID int) (string, error) {
	r, err := data.db.Collection("pages", nil).UpdateOne(context.Background(), bson.M{"id": pageID}, bson.M{"$push": bson.M{"tags": tag}}, &options.UpdateOptions{})
	if r.ModifiedCount == 0 && err == nil {
		return "not modified", nil
	} else if r.MatchedCount == 0 && err == nil {
		return "not found", nil
	} else if err != nil {
		return "error", err
	} else {
		return "success", nil
	}
}

//GetContentsOfNotebook ...
func (data *DataStore) GetContentsOfNotebook(notebookID string) (pageRefs []PageReference, e error) {
	var pageRef PageReference
	if result, err := data.db.Collection("pages", nil).Find(context.Background(), bson.M{"id": notebookID}, &options.FindOptions{}); err == nil {
		for result.Next(context.Background()) {
			if err = common.LogError("GetAPIKey(decode)", result.Decode(&pageRef)); err != nil {
				return nil, err
			}
			pageRefs = append(pageRefs, pageRef)
		}
	} else {
		return nil, err
	}
	return pageRefs, nil
}

//GetPageTags ...
func (data *DataStore) GetPageTags(pageID string) (tags []PageTag, e error) {
	projection := bson.D{{"tags", 1}, {"_id", 0}}
	result := data.db.Collection("pages", nil).FindOne(context.Background(), bson.M{"id": pageID}, options.FindOne().SetProjection(projection))
	e = common.LogError("", result.Decode(&tags))
	return tags, e
}

//GetPageByID ...
func (data *DataStore) GetPageByID(id int) (page Page, e error) {
	projection := bson.D{{"_id", 0}}
	result := data.db.Collection("pages", nil).FindOne(context.Background(), bson.M{"id": id}, options.FindOne().SetProjection(projection))
	e = common.LogError("", result.Decode(&page))
	return page, e
}

//GetPagesWithTags Returns pagerefs of docs matching the 'tag(s)' specified
func (data *DataStore) GetPagesWithTags(tags []string) (pageRefs []PageReference, err error) {
	var pageRef PageReference
	projection := bson.D{{"id", 1}, {"title", 1}, {"tags", 1}, {"_id", 0}}
	r, e := data.db.Collection("pages", nil).Find(context.Background(), bson.M{"tags": bson.M{"$in": tags}}, options.Find().SetProjection(projection))
	for r.Next(context.Background()) {
		if err = common.LogError("GetPagesWithTags(decode)", r.Decode(&pageRef)); err != nil {
			return nil, err
		}
		pageRefs = append(pageRefs, pageRef)
	}
	return pageRefs, e
}

//GetAPIKey ...
func (data *DataStore) GetAPIKey(keyHash string) (key UserAPIKey, err error) {
	projection := bson.D{{"_id", 0}}
	result := data.db.Collection("apikeys", nil).FindOne(context.Background(), bson.M{"hash": keyHash}, options.FindOne().SetProjection(projection))
	err = result.Decode(&key)
	return key, err
}

//GetAPIKeys ...
func (data *DataStore) GetAPIKeys(username string) (keys []UserAPIKey, err error) {
	var apiKey UserAPIKey
	if result, err := data.db.Collection("apikeys", nil).Find(context.Background(), bson.M{}, &options.FindOptions{}); err == nil {
		for result.Next(context.Background()) {
			if err = common.LogError("GetAPIKey(decode)", result.Decode(&apiKey)); err != nil {
				return nil, err
			}
			keys = append(keys, apiKey)
		}
	} else {
		return nil, err
	}
	return keys, nil
}

//GetUserNotebookNames ...
func (data *DataStore) GetUserNotebookNames(username string) (names []string, err error) {
	var name string
	projection := bson.D{{"name", 1}, {"_id", 0}}
	r, e := data.db.Collection("notebooks", nil).Find(context.Background(), bson.M{"owner": username}, options.Find().SetProjection(projection))
	for r.Next(context.Background()) {
		if err = common.LogError("GetAPIKey(decode)", r.Decode(&name)); err != nil {
			return nil, err
		}
		names = append(names, name)
	}
	return names, e
}

//DeleteAPIKey ...
func (data *DataStore) DeleteAPIKey(id string) error {
	_, err := data.db.Collection("apikeys", nil).DeleteOne(context.Background(), bson.M{"id": id}, &options.DeleteOptions{})
	return err
}

//DeletePage Deletes the Page with the ID specified.
func (data *DataStore) DeletePage(pageID string) error {
	_, err := data.db.Collection("pages", nil).DeleteOne(context.Background(), bson.M{"id": pageID}, &options.DeleteOptions{})
	return err
}

//DeleteTag Deletes a tag that has no assigned docs. If this function is called on with a tagid that is in active use an error is returned.
func (data *DataStore) DeleteTag(tagID string) error {
	if result, err := data.db.Collection("pages", nil).CountDocuments(context.Background(), bson.M{"tags": tagID}, &options.CountOptions{}); err == nil {
		if result > 0 {
			return errors.New("this tag is still assigned to pages in a notebook")
		} else {
			_, err := data.db.Collection("tags", nil).DeleteOne(context.Background(), bson.M{"id": tagID}, &options.DeleteOptions{})
			return err
		}
	} else {
		return err
	}
}

//DeleteNotebook ...
func (data *DataStore) DeleteNotebook(id string) error {
	var pages []PageReference
	projection := bson.D{{"pages", 1}, {"_id", 0}}
	r := data.db.Collection("notebook", nil).FindOne(context.Background(), bson.M{"id": id}, options.FindOne().SetProjection(projection))
	if r.Err() != nil {
		return r.Err()
	}

	if err := r.Decode(&pages); err != nil {
		return err
	}

	for _, p := range pages {
		_, err := data.db.Collection("pages", nil).DeleteOne(context.Background(), bson.M{"id": p.ID}, &options.DeleteOptions{})
		if err != nil {
			return err
		}
	}
	_, err := data.db.Collection("notebooks", nil).DeleteOne(context.Background(), bson.M{"id": id}, &options.DeleteOptions{})
	return err
}

//UpdatePage ...
func (data *DataStore) UpdatePage(pageID string, key string, value interface{}) (string, error) {
	r, err := data.db.Collection("pages", nil).UpdateOne(context.Background(), bson.M{"id": pageID}, bson.M{"$set": bson.M{key: value}}, &options.UpdateOptions{})
	if r.ModifiedCount == 0 && err == nil {
		return "not modified", nil
	} else if r.MatchedCount == 0 && err == nil {
		return "not found", nil
	} else if err != nil {
		return "error", err
	} else {
		return "success", nil
	}
}

func (data *DataStore) insertUniqueItem(collectionName string, doc interface{}, criteriaForCheck bson.M) (bool, error) {
	result := data.db.Collection(collectionName, nil).FindOne(context.Background(), criteriaForCheck, &options.FindOneOptions{})
	if result.Err() == mongo.ErrNoDocuments {
		if _, err := data.db.Collection(collectionName, nil).InsertOne(context.Background(), doc, &options.InsertOneOptions{}); err != nil {
			return false, err
		}
		return true, nil
	} else {
		return false, nil
	}
}

func (data *DataStore) insertItem(collectionName string, item interface{}) (bool, error) {
	if _, err := data.db.Collection(collectionName, nil).InsertOne(context.Background(), item, &options.InsertOneOptions{}); err != nil {
		return false, err
	}
	return true, nil
}
