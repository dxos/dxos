---
'@dxos/protocols': minor
---

Add an optional `getDocuments` to `EdgeFunctionEnv.DataService` and use it to fetch a document subscription's additions in one call; a host that implements it no longer pays a Durable Object round trip per document, which also stops large query results from partially timing out.
