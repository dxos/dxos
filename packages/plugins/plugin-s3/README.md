# @dxos/plugin-s3

Stores Composer file blobs in an S3-compatible bucket — Cloudflare R2, AWS S3 or MinIO.

Headless: it contributes a storage backend and a connector, and renders nothing itself. The upload
and download UI is `plugin-file`'s; this plugin only supplies a backend for it to select.

## How it fits together

| Layer                                     | Owner              |
| ----------------------------------------- | ------------------ |
| Upload/download UI, backend selection     | `plugin-file`      |
| `BlobBackend` registry on the Hypergraph  | `@dxos/echo-client`|
| Credential storage and the connection UI  | `plugin-connector` |
| S3 wire protocol, SigV4, bucket addressing| this plugin        |

A blob is addressed `s3://<host>/<spaceId>/<contentHash>`. The host is the virtual-hosted bucket
endpoint and doubles as the `AccessToken.source` its credential is filed under, so a read resolves
its own credential from the URI alone.

## Setting up a Cloudflare R2 bucket

1. Create the bucket, then create an API token scoped to it (dashboard → R2 → Manage API tokens).
   Keep the access key id and secret; the secret is shown only once.
2. Add a CORS policy allowing your app's origin. **Without this nothing works** — the browser blocks
   the request before it is sent, and the failure looks like an opaque network error rather than a
   permissions problem:

   ```json
   [
     {
       "AllowedOrigins": ["https://composer.space"],
       "AllowedMethods": ["GET", "HEAD", "PUT"],
       "AllowedHeaders": ["authorization", "content-type", "x-amz-content-sha256", "x-amz-date"],
       "ExposeHeaders": ["etag"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```

3. In Composer, connect the bucket: the endpoint is `<bucket>.<account-id>.r2.cloudflarestorage.com`.
4. Select **S3** as the storage backend in the file plugin's settings.

## Trust model

The secret access key is stored as an `AccessToken` in the space, which means **every member of that
space can read and write the bucket**. Scope each key pair to a single bucket and treat the space as
its trust boundary.

Downloads do not require a credential: a space that holds none falls back to an unsigned request,
which succeeds against a public bucket. That is what lets a viewer render a shared object without
being handed the writer's keys.

Removing the key from the client altogether means having EDGE mint presigned URLs on the client's
behalf. That is a larger change and is not what this plugin does.
