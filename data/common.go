package data

type DocType uint8

const (
	Invalid     DocType = 0
	Note        DocType = 1
	CodeSnippet DocType = 2
)

//User ...
type User struct {
	Id, PassHash string
	Username     string `storm:"id"`
	Group        string
}

//AccessLevel ...
type AccessLevel struct {
	Username string
	Scopes   []string
}

//DeleteAPIKeyRequest ...
type DeleteAPIKeyRequest struct {
	ID      string `json:"id"`
	Creator string `json:"creator"`
}

//NewPageRequest ...
type NewPageRequest struct {
	Metadata   Page   `json:"page"`
	Content    string `json:"content"`
	NotebookID string `json:"notebookID"`
}

//NewAPIKeyRequest ...
type NewAPIKeyRequest struct {
	Creator     string `json:"-"`
	Scopes      string `json:"scopes"`
	Description string `json:"description"`
}

//SharePageRequest ...
type SharePageRequest struct {
	PageID     string `json:"page"`
	PageTitle  string `json:"title"`
	NotebookID string `json:"notebook"`
}

//UserAPIKey ...
type UserAPIKey struct {
	ID          string `json:"id"`
	Hash        string `json:"hash"`
	Scopes      string `json:"scopes"`
	Creator     string `json:"creator"`
	CreatedAt   string `json:"createdAt"`
	Description string `json:"description"`
}

//NewAPIKeyResponse ...
type NewAPIKeyResponse struct {
	Key string `json:"key"`
}

//DeleteAPIKeyResponse ...
type DeleteAPIKeyResponse struct {
	Tokens []UserAPIKey `json:"keys"`
}

//Notebook ...
type Notebook struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Owner string `json:"owner"`
	Pages []Page `json:"pages"`
}

//Notebooks ...
type Notebooks struct {
	Notebooks []Notebook `json:"notebooks"`
}

//Page ...
type Page struct {
	ID         string   `json:"id"`
	Tags       []string `json:"tags"`
	Title      string   `json:"title"`
	Creator    string   `json:"creator"`
	LastEdited int64    `json:"lastEdited"`
}

//NotebookReference ...
type NotebookReference struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

//PageTag ...
type PageTag struct {
	TagID    string `json:"tagId"`
	Creator  string `json:"creator"`
	TagValue string `json:"tagValue"`
}

//ConnectionStatus ...
type ConnectionStatus struct {
	AuthInfo AuthInfo `json:"authInfo"`
	Ok       int      `json:"ok"`
}

//AuthenticatedUserRoles ...
type AuthenticatedUserRoles struct {
	Db   string `json:"db"`
	Role string `json:"role"`
}

//AuthenticatedUsers ...
type AuthenticatedUsers struct {
	Db   string `json:"db"`
	User string `json:"user"`
}

//AuthInfo ...
type AuthInfo struct {
	AuthenticatedUserRoles []AuthenticatedUserRoles `json:"authenticatedUserRoles"`
	AuthenticatedUsers     []AuthenticatedUsers     `json:"authenticatedUsers"`
}

//TagFilterResult ...
type TagFilterResult []struct {
	Pages []Page `json:"pages"`
}

//SharedPage ...
type SharedPage struct {
	ID          string `json:"id"`
	Owner       string `json:"owner"`
	PageID      string `json:"pageID"`
	PageTitle   string `json:"pageTitle"`
	NotebookID  string `json:"notebookID"`
	AccessToken string `json:"accessToken"`
}
