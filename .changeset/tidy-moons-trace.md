---
'@dxos/functions-runtime-cloudflare': patch
---

Trace document hydration in the Cloudflare data service. `updateSubscription`, the Durable Object `getDocuments` round trip inside it, `update` and `createDocument` now emit Effect spans carrying the document count, the space id, and the number of documents the host could not produce.
