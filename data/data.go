package data

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"reflect"
	"time"

	"go.mongodb.org/mongo-driver/x/mongo/driver/auth"

	"github.com/google/uuid"
	"go.alargerobot.dev/notebook/common"
	"go.alargerobot.dev/notebook/crypto"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"go.mongodb.org/mongo-driver/mongo/readpref"
	"go.mongodb.org/mongo-driver/x/mongo/driver/topology"
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

	return data.retryableQuery(func() error {
		if count, err := data.db.Collection("notebooks", nil).CountDocuments(context.Background(), bson.M{"pages.title": page.Title}, &options.CountOptions{}); err == nil {
			if count > 0 {
				return errors.New("page with the specified title alrady exists")
			}
		}

		page.LastEdited = time.Now().Unix()

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
	})

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
func (data *DataStore) NewSharedPage(sharedPageReq SharePageRequest, username string) (SharedPage, error) {
	if err := data.checkConnection(); err != nil {
		return SharedPage{}, err
	}

	var sharedPageMD SharedPage
	sharedPageMD.ID = uuid.New().String()
	sharedPageMD.Owner = username
	sharedPageMD.PageID = sharedPageReq.PageID
	sharedPageMD.NotebookID = sharedPageReq.NotebookID
	sharedPageMD.PageTitle = sharedPageReq.PageTitle
	sharedPageMD.AccessToken = common.RandomID(16)

	inserted, err := data.insertUniqueItem("sharedpages", sharedPageMD, bson.M{"pageID": sharedPageReq.PageID})

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
	var updateResult *mongo.UpdateResult
	if err := data.checkConnection(); err != nil {
		return "", err
	}
	err := data.retryableQuery(func() error {
		r, err := data.db.Collection("notebooks", nil).UpdateOne(context.Background(), bson.M{"pages.id": pageID}, bson.M{"$addToSet": bson.M{"pages.tags": tag}}, &options.UpdateOptions{})
		updateResult = r
		return err
	})
	if updateResult.ModifiedCount == 0 && err == nil {
		return "not modified", nil
	} else if updateResult.MatchedCount == 0 && err == nil {
		return "not found", nil
	} else if err != nil {
		return "error", err
	} else {
		return "success", nil
	}
}

//GetContentsOfNotebook ...
func (data *DataStore) GetContentsOfNotebook(notebookID, creator string) (pageRefs []Page, e error) {
	var pageRefMap map[string][]Page
	if err := data.checkConnection(); err != nil {
		return nil, err
	}
	e = data.retryableQuery(func() error {
		projection := bson.D{{"pages", 1}, {"_id", 0}}
		result := data.db.Collection("notebooks", nil).FindOne(context.Background(), bson.M{"id": notebookID, "owner": creator}, options.FindOne().SetProjection(projection))
		if err := common.LogError("GetContentsOfNotebook(decode)", result.Decode(&pageRefMap)); err != nil {
			return err
		}
		return result.Err()
	})
	if e != nil {
		return nil, e
	}
	return pageRefMap["pages"], nil //, nil
}

//GetPageTags ...
func (data *DataStore) GetPageTags(pageID string) (tags []PageTag, e error) {
	if err := data.checkConnection(); err != nil {
		return nil, err
	}
	e = data.retryableQuery(func() error {
		projection := bson.D{{"pages.tags", 1}, {"_id", 0}}
		result := data.db.Collection("notebooks", nil).FindOne(context.Background(), bson.M{"pages.id": pageID}, options.FindOne().SetProjection(projection))
		if result.Err() != nil {
			return result.Err()
		}
		return common.LogError("", result.Decode(&tags))
	})

	if e != nil {
		return nil, e
	}
	return tags, e
}

//GetPageByID ...
func (data *DataStore) GetPageByID(pageID, notebookID string) (page Page, e error) {
	var p []map[string][]Page
	if err := data.checkConnection(); err != nil {
		return Page{}, err
	}

	e = data.retryableQuery(func() error {
		projection := bson.D{{"$project", bson.D{{"pages", 1}, {"_id", 0}}}}
		matchStage := bson.D{{"$match", bson.D{{"pages.id", pageID}}}}
		unwindStage := bson.D{{"$unwind", "$pages"}}
		group := bson.D{{"$group", bson.M{"_id": "$id", "pages": bson.D{{"$push", "$pages"}}}}}

		r, e := data.db.Collection("notebooks", nil).Aggregate(context.Background(), mongo.Pipeline{unwindStage, matchStage, group, projection})
		if e != nil {
			return common.LogError("", e)
		}

		return r.All(context.Background(), &p)
	})

	if e != nil {
		return Page{}, common.LogError("", e)
	}

	return p[0]["pages"][0], e
}

//GetPageTitle ...

//GetPagesWithTags Returns pagerefs of docs matching the 'tag(s)' specified
func (data *DataStore) GetPagesWithTags(tags []string, notebookID string) (pages []Page, err error) {
	var filterResult TagFilterResult
	if err := data.checkConnection(); err != nil {
		return nil, err
	}

	err = data.retryableQuery(func() error {
		matchStage := bson.D{{"$match", bson.D{{"pages.tags", bson.M{"$all": tags}}, {"id", notebookID}}}}
		unwindStage := bson.D{{"$unwind", "$pages"}}
		group := bson.D{{"$group", bson.M{"_id": "$id", "pages": bson.D{{"$push", "$pages"}}}}}
		projection := bson.D{{"$project", bson.D{{"pages", 1}, {"_id", 0}}}}

		r, e := data.db.Collection("notebooks", nil).Aggregate(context.Background(), mongo.Pipeline{matchStage, unwindStage, matchStage, group, projection})
		if e != nil {
			return common.LogError("", e)
		}

		if err = r.All(context.Background(), &filterResult); err != nil {
			return err
		}

		if len(filterResult) > 0 {
			for _, res := range filterResult {
				pages = append(pages, res.Pages...)
			}
		}
		return nil
	})

	if err != nil {
		return nil, err
	}
	return pages, common.LogError("", err)
}

//GetAPIKey ...
func (data *DataStore) GetAPIKey(keyHash string) (key UserAPIKey, err error) {
	if err := data.checkConnection(); err != nil {
		return UserAPIKey{}, err
	}
	projection := bson.D{{"_id", 0}}
	err = data.retryableQuery(func() error {
		result := data.db.Collection("apikeys", nil).FindOne(context.Background(), bson.M{"hash": keyHash}, options.FindOne().SetProjection(projection))
		if result.Err() != nil {
			return result.Err()
		}
		return result.Decode(&key)
	})
	return key, err
}

//GetAPIKeys ...
func (data *DataStore) GetAPIKeys(username string) (keys []UserAPIKey, err error) {
	var apiKey UserAPIKey
	if err := data.checkConnection(); err != nil {
		return nil, err
	}

	err = data.retryableQuery(func() error {
		if result, err := data.db.Collection("apikeys", nil).Find(context.Background(), bson.M{"creator": username}, &options.FindOptions{}); err == nil {
			for result.Next(context.Background()) {
				if err = common.LogError("GetAPIKey(decode)", result.Decode(&apiKey)); err != nil {
					return err
				}
				apiKey.Hash = ""
				keys = append(keys, apiKey)
			}
		} else {
			return err
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return keys, nil
}

//GetUserNotebookNames ...
func (data *DataStore) GetUserNotebookNames(username string) (names []NotebookReference, err error) {
	var nameList map[string]string

	if err := data.checkConnection(); err != nil {
		return nil, err
	}

	err = data.retryableQuery(func() error {
		projection := bson.D{{"name", 1}, {"id", 1}, {"_id", 0}}
		r, e := data.db.Collection("notebooks", nil).Find(context.Background(), bson.M{"owner": username}, options.Find().SetProjection(projection))
		if e != nil {
			return e
		}

		for r.Next(context.Background()) {
			if err = common.LogError("GetUserNotebookNames(decode)", r.Decode(&nameList)); err != nil {
				return err
			}
			names = append(names, NotebookReference{Name: nameList["name"], ID: nameList["id"]})
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return names, nil
}

//GetPageCreator ...
func (data *DataStore) GetPageCreator(pageID string) (name string, e error) {
	if err := data.checkConnection(); err != nil {
		return "", err
	}
	var creator map[string][]map[string]string
	projection := bson.D{{"pages.creator", 1}, {"_id", 0}}

	err := data.retryableQuery(func() error {
		result := data.db.Collection("notebooks", nil).FindOne(context.Background(), bson.M{"pages.id": pageID}, options.FindOne().SetProjection(projection))
		e = common.LogError("", result.Decode(&creator))
		return e
	})

	return creator["pages"][0]["creator"], err
}

//GetTags ...
func (data *DataStore) GetTags() (tags []PageTag, e error) {
	var tag PageTag
	if err := data.checkConnection(); err != nil {
		return nil, err
	}

	projection := bson.D{{"_id", 0}}
	e = data.retryableQuery(func() error {
		r, e := data.db.Collection("tags", nil).Find(context.Background(), bson.M{}, options.Find().SetProjection(projection))

		for r.Next(context.Background()) {
			if e = common.LogError("", r.Decode(&tag)); e != nil {
				return e
			}
			tags = append(tags, tag)
		}
		return e
	})
	return tags, e

}

//GetSharedPageInfo ...
func (data *DataStore) GetSharedPageInfo(accessToken string) (SharedPage, error) {
	var page SharedPage

	if err := data.checkConnection(); err != nil {
		return SharedPage{}, err
	}

	err := data.retryableQuery(func() error {
		projection := bson.D{{"_id", 0}}

		result := data.db.Collection("sharedpages", nil).FindOne(context.Background(), bson.M{"accesstoken": accessToken}, options.FindOne().SetProjection(projection))
		if result.Err() == mongo.ErrNoDocuments {
			return errors.New("no such shared page")
		} else if result.Err() == nil {
			err := result.Decode(&page)
			return err
		} else {
			return result.Err()
		}
	})
	if err != nil {
		return SharedPage{}, err
	} else {
		return page, nil
	}
}

//GetSharedPages ...
func (data *DataStore) GetSharedPages(username string) (pages []SharedPage, err error) {
	if err := data.checkConnection(); err != nil {
		return nil, err
	}

	var queryResult *mongo.Cursor
	projection := bson.D{{"_id", 0}}
	err = data.retryableQuery(func() error {
		result, err := data.db.Collection("sharedpages", nil).Find(context.Background(), bson.M{"owner": username}, options.Find().SetProjection(projection))
		if err != nil {
			return err
		}
		queryResult = result
		return err
	})
	if err != nil {
		return []SharedPage{}, err
	} else {
		err = queryResult.All(context.Background(), &pages)
		return pages, err
	}
}

//IsValidTagID Returns true if the provided tag IDs both exist and were created by the provided username
func (data *DataStore) IsValidTagID(ids []string, username string) (bool, error) {
	if err := data.checkConnection(); err != nil {
		return false, err
	}

	var result *mongo.SingleResult
	err := data.retryableQuery(func() error {
		projection := bson.D{{"_id", 0}}
		result = data.db.Collection("tags", nil).FindOne(context.Background(), bson.D{
			{"creator", username}, {"tagid", bson.D{{"$in", ids}}}}, options.FindOne().SetProjection(projection))
		return result.Err()
	})

	if result.Err() == mongo.ErrNoDocuments {
		return false, nil
	} else if result.Err() != nil {
		return false, err
	} else {
		return true, nil
	}
}

//DeleteAPIKey ...
func (data *DataStore) DeleteAPIKey(id string) error {
	if err := data.checkConnection(); err != nil {
		return err
	}
	return data.retryableQuery(func() error {
		r, err := data.db.Collection("apikeys", nil).DeleteOne(context.Background(), bson.M{"id": id}, &options.DeleteOptions{})
		if r.DeletedCount == 0 {
			return errors.New("provided key ID was invalid")
		} else {
			return err
		}
	})
}

//DeletePage Deletes the Page with the ID specified.
func (data *DataStore) DeletePage(pageID, notebookID string) error {
	if err := data.checkConnection(); err != nil {
		return err
	}
	return data.retryableQuery(func() error {
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
	})
}

//DeleteTag Deletes a tag that has no assigned docs. If this function is called on with a tagid that is in active use an error is returned.
func (data *DataStore) DeleteTag(tagID string) error {
	if err := data.checkConnection(); err != nil {
		return err
	}
	return data.retryableQuery(func() error {
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
	})
}

//DeleteNotebook ...
func (data *DataStore) DeleteNotebook(id string) ([]Page, error) {
	if err := data.checkConnection(); err != nil {
		return nil, err
	}
	var notebook Notebook
	err := data.retryableQuery(func() error {
		r := data.db.Collection("notebooks", nil).FindOne(context.Background(), bson.M{"id": id}, &options.FindOneOptions{})
		if r.Err() != nil {
			return common.LogError("", r.Err())
		}

		if err := r.Decode(&notebook); err != nil {
			return common.LogError("", err)
		}

		if r, err := data.db.Collection("sharedpages", nil).DeleteMany(context.Background(), bson.M{"notebookid": id}, &options.DeleteOptions{}); err != nil {
			if r == nil && err != nil {
				return common.LogError("", err)
			}
		}

		dr := data.db.Collection("notebooks", nil).FindOneAndDelete(context.Background(), bson.M{"id": id}, &options.FindOneAndDeleteOptions{})
		return dr.Err()
	})
	if err != nil {
		return nil, common.LogError("", err)
	} else {
		return notebook.Pages, nil
	}
}

//DeleteSharedPage ...
func (data *DataStore) DeleteSharedPage(sharedPageID, username string) (bool, error) {
	var queryResult bool
	if err := data.checkConnection(); err != nil {
		return false, err
	}
	err := data.retryableQuery(func() error {
		dr := data.db.Collection("sharedpages", nil).FindOneAndDelete(context.Background(), bson.M{"id": sharedPageID, "owner": username}, &options.FindOneAndDeleteOptions{})
		queryResult = dr.Err() == nil
		return dr.Err()
	})
	return queryResult, common.LogError("", err)
}

//UpdatePage ...
func (data *DataStore) UpdatePage(notebookID string, value Page) (bool, error) {
	var updateResult bool
	if err := data.checkConnection(); err != nil {
		return false, err
	}
	value.LastEdited = common.UnixTimestampInMS()

	err := data.retryableQuery(func() error {
		dr := data.db.Collection("notebooks", nil).FindOneAndUpdate(context.Background(), bson.M{"id": notebookID, "pages.id": value.ID},
			bson.M{"$set": bson.M{"pages.$": value}}, &options.FindOneAndUpdateOptions{})
		updateResult = dr.Err() == nil
		return dr.Err()
	})

	return updateResult, common.LogError("", err)
}

func (data *DataStore) retryableQuery(queryFunc func() error) error {
	common.LogDebug("", "", "first try")
	if err := queryFunc(); err != nil {
		switch wrappedErr := err.(type) {
		case topology.ConnectionError:
			_, ok := wrappedErr.Wrapped.(*auth.Error)
			if ok {
				common.LogDebug("", "", "reauth required")
				common.LogError("", data.mongo.Disconnect(context.Background()))
				if err := data.ConnectToMongoDB(); err != nil {
					return err
				}
				return queryFunc()
			}
		case mongo.CommandError:
			if wrappedErr.Name == "Unauthorized" {
				common.LogDebug("", "", "reauth required")
				common.LogError("", data.mongo.Disconnect(context.Background()))
				if err := data.ConnectToMongoDB(); err != nil {
					return common.LogError("reauth", err)
				}
				return queryFunc()
			}
			break
		default:
			common.LogInfo("errorType", reflect.TypeOf(wrappedErr), wrappedErr)
			return err
		}
	}
	return nil
}
func (data *DataStore) insertUniqueItem(collectionName string, doc interface{}, criteriaForCheck bson.M) (bool, error) {
	var insertResult bool
	err := data.retryableQuery(func() error {
		result := data.db.Collection(collectionName, nil).FindOne(context.Background(), criteriaForCheck, &options.FindOneOptions{})
		if result.Err() == mongo.ErrNoDocuments {
			if _, err := data.db.Collection(collectionName, nil).InsertOne(context.Background(), doc, &options.InsertOneOptions{}); err != nil {
				insertResult = false
				return err
			}
			insertResult = true
			return nil
		} else {
			insertResult = false
			return nil
		}
	})
	return insertResult, err
}
func (data *DataStore) insertItem(collectionName string, item interface{}) (bool, error) {
	var result bool
	err := data.retryableQuery(func() error {
		if _, err := data.db.Collection(collectionName, nil).InsertOne(context.Background(), item, &options.InsertOneOptions{}); err != nil {
			result = false
			return err
		}
		result = true
		return nil
	})
	return result, err
}
func (data *DataStore) checkConnection() error {
	if err := data.mongo.Ping(context.Background(), &readpref.ReadPref{}); err != nil {
		switch wrappedErr := err.(type) {
		case topology.ConnectionError:
			_, ok := wrappedErr.Wrapped.(*auth.Error)
			if ok {
				if err := data.ConnectToMongoDB(); err != nil {
					return err
				}
			}
		}
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
