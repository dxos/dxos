# plugin-s3 — Tasks

_Resume: upload a file through the app with S3 selected as the backend, and render it — the last
untested link. Everything under it is proven: signing against real R2, the credential, and the CORS
preflight for both HEAD and PUT against the `media` bucket. Uncommitted: none._

## Phase 1: S3 blob backend + connector

A headless `@dxos/plugin-s3` filling the two slots `plugin-wnfs` already proved out: a `BlobBackend`
on the hypergraph plus a `FileCapabilities.Backend` descriptor, with credentials through
`plugin-connector`. Design and the decisions behind it: [DESIGN.md](./DESIGN.md).

### Tasks

- [x] **Survey the seams** — confirmed `plugin-file` needs no change; `BlobBackend` +
      `FileCapabilities.Backend` + `ConnectorSpec.Connector` are the three existing extension points.
- [x] **Scaffold the package** — `packages/plugins/plugin-s3`, private, headless, `labs` tag,
      `dependsOn: org.dxos.plugin.file`.
- [x] **SigV4 over WebCrypto** — `src/services/sigv4.ts`; header auth and query presigning.
- [x] **Verify signing against AWS's published vectors** — both the GET-Object header-auth and the
      presigned-URL example signatures match. 8 tests.
- [x] **URI model** — `s3://<host>/<spaceId>/<contentHash>`; region parsed from the host, `auto` as
      the fallback for R2/MinIO. 7 tests.
- [x] **S3 client** — signed PUT/GET/HEAD and presigned URLs over `fetch`; 404 and 403 are a miss,
      anything else rejects.
- [x] **Credential resolution across the promise/Effect seam** — per-space
      `credentialsLayerFromDatabase`, shared EDGE resolver layer, uncached lookup.
- [x] **Connector entry** — endpoint + key-pair credential form, endpoint normalization,
      `testConnection` via a signed HEAD on a nonexistent key. 2 tests.
- [x] **Blob backend capability** — registers under storage name `s3`, contributes the descriptor,
      unsigned read fallback for public buckets.
- [x] **Register in composer-app** — import, `isDev` default, experimental list; composer-app
      typechecks clean.
- [x] **Docs** — README (including the R2 CORS policy and the trust model), PLUGIN.mdl, changeset.
- [x] **Load it in a running Composer** — dev server on :5183 out of this worktree. The plugin lists
      in the registry under Labs with its name, description and tag; enabling it activates both
      modules with no console errors and the toggle survives a reload. `getBlobUrl` on an
      `s3://host/key` resolves through the backend to `https://host/key` while an unregistered
      scheme returns `undefined` — which proves both that the backend is registered for the scheme
      and that the unsigned public-bucket fallback works. Icon fixed on the way:
      `ph--bucket--regular` does not exist in Phosphor and the sprite builder **crashes the whole
      dev server** on a missing icon rather than warning; it is now `ph--cloud-arrow-up--regular`.

## Phase 2: Verify against a live bucket

### Tasks

- [x] **Full round trip against real R2** — `dev-sandbox-storage` in the DXOS account, via the key
      in `.secrets/r2.yml`. Nine steps pass: HEAD-miss, PUT, HEAD-hit, GET (byte-identical),
      presigned URL fetched with no `Authorization` header, unsigned read on a private bucket,
      wrong-secret rejection, and DELETE cleanup with a HEAD to confirm removal. The test object was
      deleted; nothing is left in the bucket. Script:
      `scratchpad/r2-live-test.mjs` (not committed — it reads the secret).
- [x] **Found and fixed a real bug the unit tests could not have caught.** R2 answers an
      unauthenticated request to a private bucket with **`400 InvalidArgument`**, not the `403` AWS
      returns, so the 404/403-only miss rule made the public-bucket fallback _throw_. Reads now
      distinguish signed from unsigned: a signed read is authoritative (404/403 miss, anything else
      raises), an unsigned read is speculative (any 4xx means "not publicly readable"). Regression
      coverage in `s3-client.test.ts`.
- [x] **Learned: R2 public access is a different hostname.** The S3 API endpoint always requires a
      signature; public objects are served from `pub-<hash>.r2.dev` or a custom domain. The unsigned
      fallback is therefore only reachable on R2 if the stored endpoint _is_ that public host. AWS
      and MinIO have no such split. Documented in the README.
- [ ] **Connect through the connector UI** end to end and confirm `testConnection` reports success
      for a good key and failure for a bad one. The signing underneath is proven; what is unverified
      is the UI path.
- [ ] **Upload a file** with S3 selected as the backend; confirm the object lands at
      `<spaceId>/<contentHash>` and the ECHO `Blob` records the `s3://` URI.
- [ ] **Render an image** from the bucket — exercises `getUrl`'s presigned path in an `<img>`.
- [x] **CORS confirmed in both directions.** The failure mode was observed live (no policy → the
      connection test reports the blocked request and names the origin to allow), and the fix was
      verified by issuing the real `OPTIONS` preflights against the `media` bucket: `HEAD` and `PUT`
      both answer `204` with `access-control-allow-origin: http://localhost:5183`, and `probeAccess`
      then succeeds. The README's header list is correct as written.
      Gotcha for whoever configures a bucket next: `PutBucketCors` **replaces** the entire
      configuration, so an existing production rule must be re-sent alongside any new one.
- [ ] **A non-R2 endpoint** (MinIO or real AWS S3) to confirm the region-from-host parsing is right
      where the region actually matters. R2 ignores the region, so today's pass does not exercise it.

## Phase 3: Deferred

- [ ] **EDGE-minted presigned URLs** so the secret never reaches the client. The right model for
      shared spaces; see DESIGN.md §6.
- [ ] **Multipart upload** if anything ever needs to exceed a single 5 GB `PUT`.

### References

- `packages/plugins/plugin-wnfs/src/capabilities/blob-backend.ts` — the backend precedent.
- `packages/plugins/plugin-ideogram/src/capabilities/connector.ts` — the connector precedent.
- `packages/sdk/client/src/edge/edge-blob-backend.ts` — the closest in-tree backend by shape.
- AWS SigV4 examples: the two vectors pinned in `src/services/sigv4.test.ts`.
