---
'@dxos/echo-client': patch
---

Reading an unpersisted object no longer throws when one of its refs names a registry entry by type DXN rather than an object by entity id (`Ref.fromURI`). Off-database refs are resolved against the link cache, which is keyed by entity id, so such a ref is now left unresolved instead of failing an invariant.
