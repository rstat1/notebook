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
	"go.mongodb.org/mongo-driver/mongo/readpref"
)

//DataStore ...
type DataStore struct {
	Cache           *CacheService
	mongo           *mongo.Client
	db              *mongo.Database
	vault           *crypto.VaultKMS
	stopCredRefresh bool
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
	if err := data.checkConnection(); err != nil {
		return err
	}
	if count, err := data.db.Collection("notebooks", nil).CountDocuments(context.Background(), bson.M{"pages.title": page.Title}, &options.CountOptions{}); err == nil {
		if count > 0 {
			return errors.New("page with the specified title alrady exists")
		}
	}

	r, err := data.db.Collection("notebooks", nil).UpdateOne(context.Background(), bson.M{"id": notebookID}, bson.M{"$addToSet": bson.M{"pages": page}}, &options.UpdateOptions{})
	if r != nil {
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
		return common.LogError("", err)
	}
}

//NewTag ...
func (data *DataStore) NewTag(tag PageTag) (PageTag, error) {
	if err := data.checkConnection(); err != nil {
		return PageTag{}, err
	}
	inserted, err := data.insertUniqueItem("tags", tag, bson.M{"tagvalue": tag.TagValue})
	if !inserted {
		return PageTag{}, errors.New("this tag already exists")
	}
	if err == nil {
		data.Cache.DeleteString("notescache", "tags")
		return tag, nil
	}
	return PageTag{}, err
}

//NewNotebook ...
func (data *DataStore) NewNotebook(notebook Notebook) error {
	if err := data.checkConnection(); err != nil {
		return err
	}
	inserted, err := data.insertUniqueItem("notebooks", notebook, bson.M{"name": notebook.Name})
	if !inserted {
		return errors.New("this notebook already exists")
	}
	return err
}

//NewAPIKey ...
func (data *DataStore) NewAPIKey(keyRequest NewAPIKeyRequest) (key string, err error) {
	if err := data.checkConnection(); err != nil {
		return "", err
	}
	var b [20]byte
	var apiKey UserAPIKey

	newT := time.Now().Format("Jan 2, 2006")
	if _, err := rand.Read(b[:]); err != nil {
		common.LogError("", err)
		return "", err
	}
	t := hex.EncodeToString(b[:])

	apiKey.CreatedAt = newT
	apiKey.ID = uuid.New().String()
	apiKey.Scopes = keyRequest.Scopes
	apiKey.Creator = keyRequest.Creator
	apiKey.Description = keyRequest.Description
	apiKey.Hash = hex.EncodeToString(common.ToSHA256Bytes([]byte(t)))

	if success, err := data.insertItem("apikeys", apiKey); success {
		return string(t), nil
	} else {
		return "", err
	}
}

//NewSharedPage ...
func (data *DataStore) NewSharedPage(pageID, notebookID, owner string) (SharedPage, error) {
	var sharedPageMD SharedPage
	sharedPageMD.ID = uuid.New().String()
	sharedPageMD.Owner = owner
	sharedPageMD.PageID = pageID
	sharedPageMD.NotebookID = notebookID
	sharedPageMD.AccessToken = common.RandomID(16)

	inserted, err := data.insertUniqueItem("sharedpages", sharedPageMD, bson.M{"pageID": pageID})

	if !inserted && err == nil {
		return SharedPage{}, errors.New("this page is already shared")
	} else if err == nil {
		return sharedPageMD, nil
	} else {
		common.LogError("", err)
		return SharedPage{}, err
	}
}

//AddTagToPage ...
func (data *DataStore) AddTagToPage(tag string, pageID int) (string, error) {
	if err := data.checkConnection(); err != nil {
		return "", err
	}
	r, err := data.db.Collection("notebooks", nil).UpdateOne(context.Background(), bson.M{"pages.id": pageID}, bson.M{"$addToSet": bson.M{"pages.tags": tag}}, &options.UpdateOptions{})
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
func (data *DataStore) GetContentsOfNotebook(notebookID string) (pageRefs []Page, e error) {
	if err := data.checkConnection(); err != nil {
		return nil, err
	}
	var pageRefMap map[string][]Page
	projection := bson.D{{"pages", 1}, {"_id", 0}}
	result := data.db.Collection("notebooks", nil).FindOne(context.Background(), bson.M{"id": notebookID}, options.FindOne().SetProjection(projection))
	if err := common.LogError("GetContentsOfNotebook(decode)", result.Decode(&pageRefMap)); err == nil {
		return pageRefMap["pages"], nil //, nil
	} else {
		return nil, err
	}
}

//GetPageTags ...
func (data *DataStore) GetPageTags(pageID string) (tags []PageTag, e error) {
	if err := data.checkConnection(); err != nil {
		return nil, err
	}
	projection := bson.D{{"pages.tags", 1}, {"_id", 0}}
	result := data.db.Collection("notebooks", nil).FindOne(context.Background(), bson.M{"pages.id": pageID}, options.FindOne().SetProjection(projection))
	e = common.LogError("", result.Decode(&tags))
	return tags, e
}

//GetPageByID ...
func (data *DataStore) GetPageByID(pageID, notebookID string) (page Page, e error) {
	var p map[string]interface{}
	if err := data.checkConnection(); err != nil {
		return Page{}, err
	}
	common.LogDebug("pageID", pageID, "notebookID: "+notebookID)
	projection := bson.D{{"$project", bson.D{{"pages", 1}, {"_id", 0}}}}
	matchStage := bson.D{{"$match", bson.D{{"pages.id", pageID}, {"id", notebookID}}}}
	unwindStage := bson.D{{"$unwind", "$pages"}}
	group := bson.D{{"$group", bson.M{"_id": "$id", "pages": bson.D{{"$push", "$pages"}}}}}

	r, e := data.db.Collection("notebooks", nil).Aggregate(context.Background(), mongo.Pipeline{matchStage, unwindStage, matchStage, group, projection})
	if e != nil {
		return Page{}, common.LogError("", e)
	}

	err := r.Decode(&p)
	common.LogDebug("error", err, p)
	return Page{}, nil
}

//GetPagesWithTags Returns pagerefs of docs matching the 'tag(s)' specified
func (data *DataStore) GetPagesWithTags(tags []string, notebookID string) (pages []Page, err error) {
	var filterResult TagFilterResult
	if err := data.checkConnection(); err != nil {
		return nil, err
	}

	matchStage := bson.D{{"$match", bson.D{{"pages.tags", bson.M{"$all": tags}}, {"id", notebookID}}}}
	unwindStage := bson.D{{"$unwind", "$pages"}}
	group := bson.D{{"$group", bson.M{"_id": "$id", "pages": bson.D{{"$push", "$pages"}}}}}
	projection := bson.D{{"$project", bson.D{{"pages", 1}, {"_id", 0}}}}

	r, e := data.db.Collection("notebooks", nil).Aggregate(context.Background(), mongo.Pipeline{matchStage, unwindStage, matchStage, group, projection})
	if e != nil {
		return nil, common.LogError("", e)
	}

	if err = r.All(context.Background(), &filterResult); err != nil {
		return nil, err
	}

	if len(filterResult) > 0 {
		for _, res := range filterResult {
			pages = append(pages, res.Pages...)
		}
	}

	return pages, common.LogError("", e)
}

//GetAPIKey ...
func (data *DataStore) GetAPIKey(keyHash string) (key UserAPIKey, err error) {
	if err := data.checkConnection(); err != nil {
		return UserAPIKey{}, err
	}
	projection := bson.D{{"_id", 0}}
	result := data.db.Collection("apikeys", nil).FindOne(context.Background(), bson.M{"hash": keyHash}, options.FindOne().SetProjection(projection))
	err = result.Decode(&key)
	return key, err
}

//GetAPIKeys ...
func (data *DataStore) GetAPIKeys(username string) (keys []UserAPIKey, err error) {
	if err := data.checkConnection(); err != nil {
		return nil, err
	}
	var apiKey UserAPIKey
	if result, err := data.db.Collection("apikeys", nil).Find(context.Background(), bson.M{}, &options.FindOptions{}); err == nil {
		for result.Next(context.Background()) {
			if err = common.LogError("GetAPIKey(decode)", result.Decode(&apiKey)); err != nil {
				return nil, err
			}
			apiKey.Hash = ""
			keys = append(keys, apiKey)
		}
	} else {
		return nil, err
	}
	return keys, nil
}

//GetUserNotebookNames ...
func (data *DataStore) GetUserNotebookNames(username string) (names []NotebookReference, err error) {
	if err := data.checkConnection(); err != nil {
		return nil, err
	}
	var nameList map[string]string
	projection := bson.D{{"name", 1}, {"id", 1}, {"_id", 0}}
	r, e := data.db.Collection("notebooks", nil).Find(context.Background(), bson.M{"owner": username}, options.Find().SetProjection(projection))
	if e != nil {
		return nil, e
	}
	for r.Next(context.Background()) {
		if err = common.LogError("GetUserNotebookNames(decode)", r.Decode(&nameList)); err != nil {
			return nil, err
		}
		names = append(names, NotebookReference{Name: nameList["name"], ID: nameList["id"]})
	}
	return names, e
}

//GetPageCreator ...
func (data *DataStore) GetPageCreator(pageID string) (name string, e error) {
	if err := data.checkConnection(); err != nil {
		return "", err
	}
	var creator map[string][]map[string]string
	projection := bson.D{{"pages.creator", 1}, {"_id", 0}}
	result := data.db.Collection("notebooks", nil).FindOne(context.Background(), bson.M{"pages.id": pageID}, options.FindOne().SetProjection(projection))
	e = common.LogError("", result.Decode(&creator))

	return creator["pages"][0]["creator"], e
}

//GetTags ...
func (data *DataStore) GetTags() (tags []PageTag, e error) {
	if err := data.checkConnection(); err != nil {
		return nil, err
	}

	var tag PageTag
	projection := bson.D{{"_id", 0}}
	r, e := data.db.Collection("tags", nil).Find(context.Background(), bson.M{}, options.Find().SetProjection(projection))
	for r.Next(context.Background()) {
		if e = common.LogError("", r.Decode(&tag)); e != nil {
			return nil, e
		}
		tags = append(tags, tag)
	}

	return tags, e

}

//GetSharedPageInfo ...
func (data *DataStore) GetSharedPageInfo(accessToken string) (SharedPage, error) {
	var page SharedPage
	projection := bson.D{{"_id", 0}}

	result := data.db.Collection("sharedpages", nil).FindOne(context.Background(), bson.M{"accesstoken": accessToken}, options.FindOne().SetProjection(projection))
	if result.Err() == mongo.ErrNoDocuments {
		return SharedPage{}, errors.New("no such shared page")
	} else if result.Err() == nil {
		err := result.Decode(&page)
		return page, err
	} else {
		return SharedPage{}, result.Err()
	}
}

//IsValidTagID Returns true if the provided tag IDs both exist and were created by the provided username
func (data *DataStore) IsValidTagID(ids []string, username string) (bool, error) {
	if err := data.checkConnection(); err != nil {
		return false, err
	}
	common.LogDebug("username", username, "")
	projection := bson.D{{"_id", 0}}
	result := data.db.Collection("tags", nil).FindOne(context.Background(), bson.D{
		{"creator", username}, {"tagid", bson.D{{"$in", ids}}}}, options.FindOne().SetProjection(projection))
	if result.Err() == mongo.ErrNoDocuments {
		return false, nil
	} else if result.Err() != nil {
		return false, result.Err()
	} else {
		return true, nil
	}
}

//DeleteAPIKey ...
func (data *DataStore) DeleteAPIKey(id string) error {
	if err := data.checkConnection(); err != nil {
		return err
	}
	r, err := data.db.Collection("apikeys", nil).DeleteOne(context.Background(), bson.M{"id": id}, &options.DeleteOptions{})
	if r.DeletedCount == 0 {
		return errors.New("provided key ID was invalid")
	} else {
		return err
	}
}

//DeletePage Deletes the Page with the ID specified.
func (data *DataStore) DeletePage(pageID, notebookID string) error {
	if err := data.checkConnection(); err != nil {
		return err
	}
	r, err := data.db.Collection("notebooks", nil).UpdateOne(context.Background(), bson.M{"id": notebookID}, bson.M{"$pull": bson.M{"pages": bson.M{"id": pageID}}}, &options.UpdateOptions{})
	if r.ModifiedCount == 0 && err == nil {
		return errors.New("not modified")
	} else if r.MatchedCount == 0 && err == nil {
		return errors.New("not found")
	} else if err != nil {
		return err
	} else {
		dr := data.db.Collection("sharedpages", nil).FindOneAndDelete(context.Background(), bson.M{"pageid": pageID}, &options.FindOneAndDeleteOptions{})
		if dr.Err() == nil {
			return nil
		} else {
			return dr.Err()
		}
	}
}

//DeleteTag Deletes a tag that has no assigned docs. If this function is called on with a tagid that is in active use an error is returned.
func (data *DataStore) DeleteTag(tagID string) error {
	if err := data.checkConnection(); err != nil {
		return err
	}
	if result, err := data.db.Collection("notebooks", nil).CountDocuments(context.Background(), bson.M{"pages.tags": tagID}, &options.CountOptions{}); err == nil {
		if result > 0 {
			return errors.New("this tag is still assigned to pages in a notebook")
		} else {
			_, err := data.db.Collection("tags", nil).DeleteOne(context.Background(), bson.M{"tagid": tagID}, &options.DeleteOptions{})
			if err == nil {
				data.Cache.DeleteString("notescache", "tags")
				return nil
			}
			return err
		}
	} else {
		return err
	}
}

//DeleteNotebook ...
func (data *DataStore) DeleteNotebook(id string) ([]Page, error) {
	if err := data.checkConnection(); err != nil {
		return nil, err
	}
	var notebook Notebook
	r := data.db.Collection("notebooks", nil).FindOne(context.Background(), bson.M{"id": id}, &options.FindOneOptions{})
	if r.Err() != nil {
		return nil, common.LogError("", r.Err())
	}

	if err := r.Decode(&notebook); err != nil {
		return nil, common.LogError("", err)
	}

	if _, err := data.db.Collection("sharedpages", nil).DeleteMany(context.Background(), bson.M{"notebookid": id}, &options.DeleteOptions{}); err != nil {
		return []Page{}, err
	}

	dr := data.db.Collection("notebooks", nil).FindOneAndDelete(context.Background(), bson.M{"id": id}, &options.FindOneAndDeleteOptions{})
	return notebook.Pages, common.LogError("", dr.Err())
}

//DeleteSharedPage ...
func (data *DataStore) DeleteSharedPage(sharedPageID string) (bool, error) {
	dr := data.db.Collection("sharedpages", nil).FindOneAndDelete(context.Background(), bson.M{"id": sharedPageID}, &options.FindOneAndDeleteOptions{})
	return dr.Err() == nil, common.LogError("", dr.Err())
}

//UpdatePage ...
func (data *DataStore) UpdatePage(pageID string, key string, value interface{}) (string, error) {
	if err := data.checkConnection(); err != nil {
		return "", err
	}

	if key == "tags" {
		//TODO: Validate tags
	}

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
func (data *DataStore) checkConnection() error {
	if err := data.mongo.Ping(context.Background(), &readpref.ReadPref{}); err != nil {
		if err == mongo.ErrClientDisconnected {
			if err := data.ConnectToMongoDB(); err != nil {
				return err
			}
		} else {
			return err
		}
	}
	return nil
}
