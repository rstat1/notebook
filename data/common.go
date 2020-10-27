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

//Collection ...
type Collection struct {
	Name string `storm:"id" json:"name"`
}

//Collections ...
type Collections struct {
	Collections []Collection `json:"collections"`
}

//UserAPIToken ...
type UserAPIToken struct {
	ID        int    `storm:"id,increment"`
	Name      string `json:"name"`
	Scopes    string `json:"scopes"`
	Creator   string `json:"creator"`
	CreatedAt string `json:"createdAt"`
	TokenHash string `json:"tokenHash"`
}

//NewAPITokenResponse ...
type NewAPITokenResponse struct {
	Token string `json:"token"`
}

//DeleteTokenResponse ...
type DeleteTokenResponse struct {
	Tokens []UserAPIToken `json:"tokens"`
}

//Document ...
type Document struct {
	ID        int           `json:"id"`
	Tags      []DocumentTag `json:"tags"`
	Title     string        `json:"title"`
	Layout    string        `json:"layout"`
	Timestamp int64         `json:"timestamp"`
}

//DocumentReference ...
type DocumentReference struct {
	ID    int           `json:"id"`
	Title string        `json:"title"`
	Tags  []DocumentTag `json:"tags"`
}

//DocumentTag ...
type DocumentTag struct {
	TagID    int    `json:"tagId"`
	TagValue string `json:"tagValue"`
}

//DocTagsColumn ...
type DocTagsColumn struct {
	TagIDs []int `json:"tags"`
}
