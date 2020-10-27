package crypto

//ProjectCryptoKeys ...
type ProjectCryptoKeys struct {
	BlobKeys              map[string]ProjectBlobKey `json:"blobKeys"`
	SealedMasterCryptoKey []byte                    `json:"key"`
}

//ProjectBlobKey ...
type ProjectBlobKey struct {
	BlobName  string `json:"name"`
	IV        string `json:"iv"`
	SealedKey string `json:"key"`
	// SealedKey [64]byte `json:"key"`
}
