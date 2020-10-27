package api

import (
	"context"
	"encoding/json"
	"time"

	"github.com/graphql-go/graphql"
	"go.alargerobot.dev/notebook/common"
	"go.alargerobot.dev/notebook/data"
)

//NewGraphQLServer ...
func NewGraphQLServer() *GraphQLServer {
	return &GraphQLServer{
		queryObjectFields:   make(map[string]*graphql.Field),
		mutatorObjectFields: make(map[string]*graphql.Field),
	}
}

//MakeRootGraphQLObjects ...
func (gql *GraphQLServer) MakeRootGraphQLObjects() {
	query := graphql.NewObject(graphql.ObjectConfig{
		Name:        "Query",
		Description: "Query all the things!",
		Fields:      graphql.Fields{},
	})
	mutator := graphql.NewObject(graphql.ObjectConfig{
		Name:   "Mutation",
		Fields: graphql.Fields{},
	})

	for k, v := range gql.queryObjectFields {
		query.AddFieldConfig(k, v)
	}
	for k, v := range gql.mutatorObjectFields {
		mutator.AddFieldConfig(k, v)
	}
	newSchema, err := graphql.NewSchema(graphql.SchemaConfig{
		Query:    query,
		Mutation: mutator,
	})
	if err != nil {
		common.Logger.WithField("func", "MakeQueryObject").Errorln(err)
	}
	gql.schema = newSchema
}

//Query ...
func (gql *GraphQLServer) Query(ctx context.Context, query, id, opType string, vars map[string]interface{}, cache *data.CacheService) string {
	defer common.TimeTrack(time.Now())
	var dataAsJSON []byte
	var result *graphql.Result

	result = gql.runGQLQuery(ctx, query, id, opType, vars, cache)
	dataAsJSON, _ = json.Marshal(result)
	if result.HasErrors() == false {
		if opType == "query" {
			cache.PutString("dcgqlcache", id, string(dataAsJSON))
		} else {
			cache.DeleteString("dcgqlcache", id)
		}
	}
	return string(dataAsJSON)
}

//AddQueryObject ...
func (gql *GraphQLServer) AddQueryObject(name, description string, object *graphql.Object, resolver func(p graphql.ResolveParams) (interface{}, error)) {
	common.Logger.Debugln(name)
	gql.queryObjectFields[name] = &graphql.Field{
		Type:        object,
		Description: description,
		Resolve:     resolver,
	}
}

//AddQueryObjectWithArgs ...
func (gql *GraphQLServer) AddQueryObjectWithArgs(name, description string, object *graphql.Object, resolver func(p graphql.ResolveParams) (interface{}, error),
	args graphql.FieldConfigArgument) {
	gql.queryObjectFields[name] = &graphql.Field{
		Type:        object,
		Description: description,
		Resolve:     resolver,
		Args:        args,
	}
}

//AddQueryObjectField ...
func (gql *GraphQLServer) AddQueryObjectField(name string, field *graphql.Field) {
	gql.queryObjectFields[name] = field
}

//AddMutator ...
func (gql *GraphQLServer) AddMutator(name string, field *graphql.Field) {
	gql.mutatorObjectFields[name] = field
}

func (gql *GraphQLServer) runGQLQuery(ctx context.Context, query, id, opType string, vars map[string]interface{}, cache *data.CacheService) *graphql.Result {
	r := graphql.Do(graphql.Params{
		Schema:         gql.schema,
		Context:        ctx,
		RequestString:  query,
		VariableValues: vars,
	})
	if r.HasErrors() {
		common.Logger.WithField("func", "Query").Errorln(r.Errors)
	}
	return r
}
