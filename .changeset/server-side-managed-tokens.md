---
'@dxos/protocols': minor
---

Deployed functions can now resolve server-custodied access tokens. A function has no identity to
authenticate to EDGE's `/oauth/token` with, so `EdgeFunctionEnv.Env` gains an optional
`ACCESS_TOKEN_SERVICE` binding that the runtime turns into a `Credential.AccessTokenResolver`. The
binding is created bound to the invocation's space, so a function can only reach credentials for the
space it runs in. Built-in operations run in a separate worker that does not yet receive the binding
and so cannot resolve a managed token; EDGE must supply it there before enrolling a provider whose
operations run server-side.
