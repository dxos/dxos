# plugin-s3 — Design

Upload and download Composer files to an S3-compatible bucket, with Cloudflare R2 as the motivating
target. Credentials arrive through a Connector.

## 1. Where the capability belongs

The question that started this was whether the capability belongs in `plugin-file`, a new
`plugin-cloudflare`, or both. **Both, split the way the codebase already prescribes.**

`plugin-file` is not a storage implementation — it is a thin UI/registry layer over a pluggable
backend system that already exists:

- `BlobBackend` (`packages/core/echo/echo-protocol/src/blob.ts`) is the storage contract:
  `{ schemes, maxSize?, put, get, has, getUrl? }`, registered with
  `graph.registerBlobBackend(name, backend)`.
- `FileCapabilities.Backend` is the multi capability carrying the settings-UI descriptor.
- `plugin-wnfs` is the working precedent for an out-of-tree backend: it implements the interface,
  registers it on the hypergraph and contributes the descriptor. Nothing in `plugin-file` knows WNFS
  exists.

So no change to `plugin-file` was required, and none was made. The new plugin fills the same two
slots WNFS fills.

Credentials are equally already-owned: `plugin-connector` holds the connector registry, the
credential form UI and the `AccessToken`/`Connection` objects; `Credential.CredentialsService`
resolves them. `plugin-ideogram` is the canonical vendor-plugin shape — headless, contributing one
service capability plus one connector entry.

**Naming.** `plugin-s3`, not `plugin-cloudflare`. The protocol is S3 and R2 is one endpoint of many
(AWS, MinIO). A Cloudflare-named package would also attract unrelated Cloudflare surface — Calls,
Workers — into a package that is about object storage.

## 2. Addressing

A blob is `s3://<host>/<spaceId>/<contentHash>`.

The interesting decision is the **host**. `AccessToken` gives us `source` (a hostname), `account` (a
non-secret secondary identifier) and `token` (the secret) — but an S3 connection needs endpoint,
bucket, region, key id and secret: five values into three fields.

Resolved by using **virtual-hosted-style addressing**, which is how S3 addresses buckets anyway:

| Value             | Where it lives                                                       |
| ----------------- | -------------------------------------------------------------------- |
| bucket + endpoint | `AccessToken.source` = `<bucket>.<account>.r2.cloudflarestorage.com` |
| access key id     | `AccessToken.account`                                                |
| secret key        | `AccessToken.token`                                                  |
| region            | parsed from the host; `auto` when it encodes none (R2, MinIO)        |

This buys three things: one `Connection` addresses exactly one bucket (the granularity `Connection`
already models); a read resolves its own credential from the URI's host with no side table mapping
blobs to configuration; and no new ECHO type is needed.

Note the one place this diverges from a single-service connector: `ConnectorEntry.source` is the
static string `s3`, and is **not** what lands in `AccessToken.source`. Only the coordinator's OAuth
path reads `connector.source`, and this connector authenticates by credential form, so nothing
observes the difference.

## 3. Signing

SigV4 is hand-rolled over WebCrypto (`src/services/sigv4.ts`, ~150 lines) rather than taken from
`@aws-sdk/*`. The SDK's signer drags in a credential-provider chain, a region resolver and a Node
crypto shim, none of which apply to a browser holding one static key pair, at two orders of
magnitude the bundle size.

Correctness is established against **AWS's own published example signatures** for both the
header-auth and presigned-URL forms. Those two vectors are the difference between tests that prove
the implementation is right and tests that prove it is merely self-consistent.

Two non-obvious constraints found while building it:

- **`content-length` must not be signed.** It is a forbidden header name, so the browser sets it
  itself and strips ours. Signing it guarantees a mismatch that the server reports as a bad
  signature rather than as a missing header — a genuinely misleading failure.
- **Percent-encoding must be RFC 3986, not `encodeURIComponent`.** The latter leaves `!'()*`
  unescaped and AWS rejects the signature.

## 4. Answers to the three questions posed at the outset

1. **CORS.** Accepted: the bucket must allow the app origin for `GET`/`HEAD`/`PUT`. Direct-from-
   browser was chosen over proxying through EDGE, which would have made this an EDGE feature rather
   than a client blob backend. The cost is documented prominently, because a missing CORS policy
   surfaces as an opaque network error rather than a 403 and is otherwise very hard to diagnose.
2. **Secret in the client.** Accepted, scoped: the secret is replicated into the space, so every
   member of that space can read and write the bucket. Correct for a personal or small-team bucket;
   the README says so plainly rather than burying it. Removing the key from the client means having
   EDGE mint presigned URLs — a larger change, deliberately not attempted here (§6).
3. **Credential-less download.** Implemented: when a space holds no credential for the URI's host,
   `get`/`has`/`getUrl` fall through to an unsigned request. That succeeds against a public bucket
   and fails against a private one, which is exactly the desired behavior — a viewer renders a
   shared object without being handed the writer's keys.

## 5. The plain-promise / Effect seam

`BlobBackend` is a plain-promise interface called with a `spaceId`. It therefore cannot receive a
space-scoped `CredentialsService` through the layer graph the way an Operation does.

`src/services/s3-credentials.ts` builds the credentials layer per space from that space's own
database, reusing `credentialsLayerFromDatabase` rather than reading `AccessToken` objects directly
— which matters, because a direct read would silently skip EDGE resolution of a server-custodied
token and hand back its opaque placeholder as if it were a key. The EDGE resolver layer is built
once and shared, since it caches by (space, token); the credential lookup itself is not cached, so a
rotated key takes effect on the next request.

## 6. Not built

- **EDGE-minted presigned URLs**, which would keep the secret off the client entirely. The right
  answer for shared/multi-user spaces; a different and larger project.
- **Bucket listing / browsing.** The backend is content-addressed and ECHO holds the filenames.
- **Multipart upload.** Single `PUT` caps at 5 GB, well past anything the file plugin surfaces.
- **A settings surface.** Backend selection is `plugin-file`'s existing setting; the connection is
  `plugin-connector`'s existing UI.
