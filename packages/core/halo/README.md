# HALO

## space state

space state maintains a set of trusted keys.
The set is initialized with a single space key.
`KEY_ADMIT` messages can be used to add `IDENTITY` or `DEVICE` keys to that set.
Each valid credential message must at least have one signature from the trusted key set.
