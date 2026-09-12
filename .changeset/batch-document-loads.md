---
'@dxos/protocols': minor
---

**Breaking:** `EdgeFunctionEnv.DataService.getDocument` is replaced by `getDocuments`, which takes an array of ids and returns the documents that exist. A host implementing this interface must provide the batched form; the singular one is gone, because every call is a Durable Object round trip and a singular read invites a caller loop that costs one wake latency per document.
