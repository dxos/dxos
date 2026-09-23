---
'@dxos/echo': patch
---

`IndexEngine` and the index stores behind it now take their SQL client as a constructor argument
instead of requiring it in the environment of every method. Their effects no longer carry a
`SqlClient` requirement, so a caller provides the client once at construction rather than at each
call. Constructing one directly is a breaking change: `new IndexEngine()` becomes
`new IndexEngine(sql)`.
