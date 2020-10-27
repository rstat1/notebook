//go:generate gqlgen -apidef api.json -defPath ./definitions/ -outPath ./generated/

package api

import (
	"errors"

	"github.com/graphql-go/graphql"
	"go.alargerobot.dev/notebook/api/generated"
	"go.alargerobot.dev/notebook/common"
	"go.alargerobot.dev/notebook/data"
)

//GraphQLResolver ...
type GraphQLResolver struct {
	db     *data.DataStore
	Server *GraphQLServer
}

//GraphQLServer ...
type GraphQLServer struct {
	schema              graphql.Schema
	queryObjectFields   map[string]*graphql.Field
	mutatorObjectFields map[string]*graphql.Field
}

//NewGQLResolver ...
func NewGQLResolver(data *data.DataStore) *GraphQLResolver {
	gql := NewGraphQLServer()
	service := &GraphQLResolver{
		db:     data,
		Server: gql,
	}
	generated.InitGraphQLService(gql, service)
	service.Server.MakeRootGraphQLObjects()
	return service
}

// GetDocuments ...
func (resolve *GraphQLResolver) GetDocuments(params graphql.ResolveParams) (interface{}, error) {
	user := params.Context.Value("accesslevel").(data.AccessLevel)
	if common.Contains(user.Scopes, "api") == false {
		return nil, errors.New("unauthorized")
	}

	tags, _ := params.Args["tags"].([]interface{})
	limit, _ := params.Args["limit"].(int)

	return resolve.db.GetDocumentsWithTags(common.ConvertInterfaceArrToIntArr(tags), limit)
}

// GetDocument ...
func (resolve *GraphQLResolver) GetDocument(params graphql.ResolveParams) (interface{}, error) {
	user := params.Context.Value("accesslevel").(data.AccessLevel)
	if common.Contains(user.Scopes, "api") == false {
		return nil, errors.New("unauthorized")
	}

	id, _ := params.Args["id"].(int)

	return resolve.db.GetDocumentByID(id)
}

// GetAlltags ...
func (resolve *GraphQLResolver) GetAlltags(params graphql.ResolveParams) (interface{}, error) {
	user := params.Context.Value("accesslevel").(data.AccessLevel)
	if common.Contains(user.Scopes, "api") == false {
		return nil, errors.New("unauthorized")
	}

	return resolve.db.GetDocumentTags()
}

// GetTags ...
func (resolve *GraphQLResolver) GetTags(params graphql.ResolveParams) (interface{}, error) {
	user := params.Context.Value("accesslevel").(data.AccessLevel)
	if common.Contains(user.Scopes, "api") == false {
		return nil, errors.New("unauthorized")
	}

	// id, _ := params.Args["id"].(string)
	return nil, nil
}

// NewDocument ...
func (resolve *GraphQLResolver) NewDocument(params graphql.ResolveParams) (interface{}, error) {
	user := params.Context.Value("accesslevel").(data.AccessLevel)
	if common.Contains(user.Scopes, "api") == false {
		return nil, errors.New("unauthorized")
	}

	title, _ := params.Args["title"].(string)
	tags, _ := params.Args["tags"].([]interface{})
	layout, _ := params.Args["layout"].(string)

	if len(tags) == 0 {
		return nil, errors.New("tags cannot be null")
	}

	return resolve.db.NewDocument(title, layout, common.ConvertInterfaceArrToIntArr(tags))
}

// NewTag ...
func (resolve *GraphQLResolver) NewTag(params graphql.ResolveParams) (interface{}, error) {
	user := params.Context.Value("accesslevel").(data.AccessLevel)
	if common.Contains(user.Scopes, "api") == false {
		return nil, errors.New("unauthorized")
	}

	value, _ := params.Args["value"].(string)

	if value == "" {
		return nil, common.LogError("", errors.New("tag value cannot be null"))
	}
	tag, err := resolve.db.NewTag(value)
	return tag, common.LogError("", err)
}

// DeleteDocument ...
func (resolve *GraphQLResolver) DeleteDocument(params graphql.ResolveParams) (interface{}, error) {
	user := params.Context.Value("accesslevel").(data.AccessLevel)
	if common.Contains(user.Scopes, "api") == false {
		return nil, errors.New("unauthorized")
	}

	id, _ := params.Args["id"].(int)
	return resolve.db.DeleteDocument(id)
}

// DeleteTag ...
func (resolve *GraphQLResolver) DeleteTag(params graphql.ResolveParams) (interface{}, error) {
	user := params.Context.Value("accesslevel").(data.AccessLevel)
	if common.Contains(user.Scopes, "api") == false {
		return nil, errors.New("unauthorized")
	}

	id, _ := params.Args["id"].(int)
	return resolve.db.DeleteTag(id)
}

// UpdateTags ...
func (resolve *GraphQLResolver) UpdateTags(params graphql.ResolveParams) (interface{}, error) {
	user := params.Context.Value("accesslevel").(data.AccessLevel)
	if common.Contains(user.Scopes, "api") == false {
		return nil, errors.New("unauthorized")
	}

	id, _ := params.Args["id"].(int)
	tags, _ := params.Args["tags"].([]interface{})

	if e := resolve.db.AddTagsToDocument(common.ConvertInterfaceArrToIntArr(tags), id); e == nil {
		return true, nil
	} else {
		return false, e
	}
}

// UpdateDocument ...
func (resolve *GraphQLResolver) UpdateDocument(params graphql.ResolveParams) (interface{}, error) {
	user := params.Context.Value("accesslevel").(data.AccessLevel)
	if common.Contains(user.Scopes, "api") == false {
		return nil, errors.New("unauthorized")
	}

	id, _ := params.Args["id"].(int)
	newValue, _ := params.Args["newValue"].(string)
	changeType, _ := params.Args["changeType"].(string)

	if changeType == "layout" {
		return resolve.db.UpdateDocLayout(newValue, id)
	} else if changeType == "title" {
		return resolve.db.UpdateDocTitle(newValue, id)
	} else {
		return false, errors.New("changeType is invalid. Choices are: title, layout")
	}
}
