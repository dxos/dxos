---
'@dxos/echo': patch
---

Pack a credential assertion's `type_url` as the bare type name.

EDGE keys its credential-assertion registry by bare `typeName` and emits that form itself, but
`anyPack` writes the spec form `type.googleapis.com/<name>`. Since the buf migration the client sent
the prefixed form, so every verifiable presentation failed EDGE's lookup and the websocket upgrade
returned 500 — clients reconnected forever without ever connecting once. Pre-migration the assertion
was inlined under a bare `@type`, which hit EDGE's fallback path, so the change of form crossed the
repo boundary unnoticed.

Signatures and credential ids are unaffected: both are digests of the signing payload, which
normalizes the url through `typeNameOf` and then drops `@type` in `canonicalStringify`. buf's own
`anyUnpack`/`anyIs` normalize either form, so the bare url still round-trips.
