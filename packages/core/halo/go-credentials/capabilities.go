package credentials

const OWNER_CAPABILITY = "owner"

// Map of capabilities to their respective weight.
var Capabilities = map[string]int32{
	OWNER_CAPABILITY: 10000,
}
