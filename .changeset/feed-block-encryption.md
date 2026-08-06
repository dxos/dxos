---
'@dxos/feed': minor
---

Add optional at-rest encryption for feed blocks. `FeedStore` accepts a `Cypher` that decides per feed whether to seal block payloads and provides encrypt/decrypt; without one, blocks are stored as plaintext (no encryption by default). Blocks gain `encryptionKeyId` + `iv` envelope fields, and a reference `WebCryptoCypher` (AES-256-GCM) ships for the browser, Node, and Cloudflare Workers.
