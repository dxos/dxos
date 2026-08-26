# plugin-s3 — Tasks

_Resume: verify an upload and a render against a real R2 bucket (Phase 2) — nothing has been run
against a live endpoint yet. Uncommitted: none. Last: Phase 1 complete, package builds/tests/lints
clean and composer-app typechecks with the plugin registered._

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

## Phase 2: Verify against a live bucket

Nothing has touched a real endpoint. Everything below needs an actual R2 bucket and a key pair,
which only the user can create — see "Handing an agent a credential" in AGENTS.md (`.secrets/`).

### Tasks

- [ ] **Connect a real R2 bucket** through the connector UI and confirm `testConnection` reports
      success (404 path) and reports failure for a bad key (403 path).
- [ ] **Upload a file** with S3 selected as the backend; confirm the object lands at
      `<spaceId>/<contentHash>` and the ECHO `Blob` records the `s3://` URI.
- [ ] **Render an image** from the bucket — exercises `getUrl`'s presigned path in an `<img>`.
- [ ] **Confirm the CORS failure mode** with the policy absent, and check the README's policy is
      sufficient (particularly the `AllowedHeaders` list against a real signed PUT).
- [ ] **Public-bucket read with no credential in the space** — the unsigned fallback path, which is
      the one behavior with no test coverage at all.
- [ ] **A non-R2 endpoint** (MinIO or real AWS S3) to confirm the region-from-host parsing is right
      where the region actually matters.

## Phase 3: Deferred

- [ ] **EDGE-minted presigned URLs** so the secret never reaches the client. The right model for
      shared spaces; see DESIGN.md §6.
- [ ] **Multipart upload** if anything ever needs to exceed a single 5 GB `PUT`.

### References

- `packages/plugins/plugin-wnfs/src/capabilities/blob-backend.ts` — the backend precedent.
- `packages/plugins/plugin-ideogram/src/capabilities/connector.ts` — the connector precedent.
- `packages/sdk/client/src/edge/edge-blob-backend.ts` — the closest in-tree backend by shape.
- AWS SigV4 examples: the two vectors pinned in `src/services/sigv4.test.ts`.
