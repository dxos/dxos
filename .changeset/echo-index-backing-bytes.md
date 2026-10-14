---
'@dxos/echo': minor
---

Query rows on the `QueryService` wire (`query.proto`) carry the `heads`, `bytes`, `created_at` and `updated_at` a client needs to show an object without loading its document, and `document_json` is specified as the `objectStructureToJson` format. `@dxos/index-core` can store a document's bytes with its snapshot (`IndexerObject.bytes`, returned by `queryBackings`), `isBackable` and `backingJson` move to `@dxos/echo-protocol`, and the Cloudflare functions runtime no longer fetches documents for passive subscriptions.
