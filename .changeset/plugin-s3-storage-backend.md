---
'@dxos/plugin-file': minor
'@dxos/compute-runtime': minor
---

Files can now be stored in an S3-compatible bucket — Cloudflare R2, AWS S3 or MinIO — through a new headless plugin, `@dxos/plugin-s3`. It contributes a `BlobBackend` under the storage name `s3` plus the matching `FileCapabilities.Backend` descriptor, so **S3** appears alongside Inline, Edge and WNFS in the file plugin's storage setting. `plugin-file` itself is unchanged: the backend seam it already exposed for WNFS is the one this uses.

Credentials go through `plugin-connector`. The connector's credential form takes a bucket endpoint and an access key pair and stores them as an `AccessToken` whose `source` is the bucket host, so one connection addresses exactly one bucket and a blob's `s3://<host>/<key>` URI resolves its own credential with no side table. Requests are signed with SigV4 computed over WebCrypto rather than through an AWS SDK, and the signer is tested against AWS's own published example signatures.

**The backend is not browser-only.** The protocol code lives in `@dxos/echo-client` under a new `./blob-s3` export — beside the blob manager that owns the backend registry — and its database bindings in `@dxos/compute-runtime`, whose `FunctionContext` registers the backend on the `EchoClient` it builds for operations. So a function — including one invoked by an agent over MCP — writes to the bucket its space is connected to, rather than falling back to inline storage and its 4 MiB cap. Nothing Cloudflare-specific is involved: the backend makes an outbound request to the customer's own endpoint.

Two operator requirements are worth stating up front. The bucket's CORS policy must allow the app origin for `GET`, `HEAD` and `PUT`, or the browser blocks each request before it is sent and the failure reads as an opaque network error rather than a permissions problem. And because the secret key is stored in the space, every member of that space can read and write the bucket — scope each key pair to one bucket and treat the space as its trust boundary. Reads fall back to an unsigned request when the space holds no credential, which is what lets a public bucket's objects render for a viewer who was never given the keys.
