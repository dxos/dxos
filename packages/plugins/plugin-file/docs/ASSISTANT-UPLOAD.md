# Assistant-driven file upload — design

Today an assistant can **read** files and cannot **create** them. This specs the missing half, and
the path an out-of-process agent (Claude in a cloud sandbox, Claude Desktop) would take to use it.

## 1. Why `FileOperation.Create` cannot simply be exposed

The File skill (`src/skills/file-skill.ts`) lists exactly one tool:

```ts
tools: Skill.toolDefinitions({ operations: [FileOperation.Read] }),
```

`FileOperation.Create` exists and works — it is what the upload UI invokes — but its input is
unreachable from any tool call:

```ts
input: FileCapabilities.FileAction.CreateFileSchema.mapFields(Struct.assign({ db: Database.Database }));
// where CreateFileSchema = Schema.Struct({ file: Schema.instanceOf(File) })
```

Two separate blockers, and the second is the one worth internalising:

1. `Schema.instanceOf(File)` is a live browser `File` handle. A model cannot construct one and it
   does not serialize.
2. **An operation whose input cannot render as JSON Schema is silently dropped from the registry.**
   `Operation.serializable()` (`packages/core/compute/compute/src/Operation.ts:506-517`) catches the
   throw and logs at `verbose`. A dropped operation is invisible to `queryOperations` and
   unreachable by `invokeOperation` — it does not fail loudly, it simply is not there.
   `SpaceOperation.ImportSpace` (`contents: Schema.instanceOf(Uint8Array)`) is already in this
   state.

So the fix is a sibling operation with a JSON-representable input. `Create` stays as the UI's entry
point.

## 2. The operation

`FileOperation.CreateFromSource`, in `src/types/FileOperation.ts`.

### Input

```ts
export const FileSource = Schema.Union([
  Schema.Struct({
    type: Schema.Literal('base64'),
    mediaType: Schema.String,
    data: Schema.String,
  }),
  Schema.Struct({
    type: Schema.Literal('http'),
    url: Schema.String,
  }),
]);

input: Schema.Struct({
  source: FileSource,
  name: Schema.optional(Schema.String),
}),
services: [Database.Service],
```

The union mirrors `ContentBlock.ImageSource`
(`packages/sdk/types/src/types/ContentBlock.ts:246`) rather than inventing a shape — it is how this
repo already models "bytes or a pointer to bytes". A union survives the wire: `Schema.Union`
serializes to `anyOf` and is reconstituted by `toEffectSchema`
(`packages/core/echo/echo/src/internal/JsonSchema/json-schema.ts:319-320`).

The two arms have genuinely different cost profiles:

- **`base64`** — the agent already holds the bytes (it generated an image). The payload is a
  tool-call argument, so it occupies the agent's context twice over, inflated 4/3 plus JSON
  escaping. **The binding limit here is the context window, not any coded cap** — there is no
  request-size limit anywhere on the MCP path.
- **`http`** — the bytes live somewhere the _host_ can fetch, and nothing large crosses the model
  context. This is the only viable arm past a few hundred kilobytes.

`mediaType` is required on the base64 arm and taken from the response `Content-Type` on the http
arm, because `isAcceptedMimeType` gates on it and inferring from a file extension is how an
executable gets stored as `image/png`.

**The database is a service, not an input field.** `Create` takes `db: Database.Database` inline,
which is fine for a UI caller holding a live handle and fatal over MCP. Declaring
`services: [Database.Service]` has a second effect worth knowing: `requiresSpace` is **derived** from
exactly that (`mcp-server/src/internal/view.ts:183-184`), and there is **no ambient default space**
— so the caller is forced to name a `spaceId` and gets `invalid_request` otherwise
(`internal/space.ts:39-47`). That is the behaviour you want for a write.

### Handler

Reuses `create.ts` wholesale; only byte acquisition differs:

1. Resolve bytes — decode base64, or fetch the URL.
2. `isAcceptedMimeType(type)` → `UnsupportedFileTypeError`.
3. `resolveActiveStorage` — the exported helper in `create.ts`, unchanged. This is what makes an
   assistant upload land in S3/R2 when that backend is selected, with no S3-specific code here.
4. `File.fromBytes(bytes, { name, type, storage })` → `Database.add`.

Everything from step 2 down is shared with the UI path, so the two cannot drift on validation or on
which backend they write to.

### The `http` arm is the security-sensitive half

The handler fetches a URL **the model chose**. Without a guard that is a request-forgery primitive
pointed at whatever the host can reach — and on the CLI host, "whatever the host can reach" includes
the developer's local network.

Do not invent the guard: `plugin-crm`'s `attachImage`
(`packages/plugins/plugin-crm/src/operations/attach-image.ts:203-238`) is the in-tree precedent for
pulling external bytes into a space, with an SSRF guard and a 10 MiB cap. Reuse its approach —
private-range blocking, response cap, timeout, and the declared `Content-Type`. The guard belongs in
the handler, never in skill instructions, which a model can ignore.

### Skill

```ts
tools: Skill.toolDefinitions({ operations: [FileOperation.Read, FileOperation.CreateFromSource] }),
```

Instructions should state the ceiling and steer toward `http`, since a model will otherwise reach
for base64 every time — it is the arm needing no external setup.

## 3. Size ceilings, in the order they bite

| Limit                   | Value                      | Where                                                                          |
| ----------------------- | -------------------------- | ------------------------------------------------------------------------------ |
| base64 arm, in practice | the agent's context window | no coded cap exists on the MCP path                                            |
| Proposed base64 arm cap | 1 MB                       | this operation                                                                 |
| `Blob.MAX_INLINE_SIZE`  | 4 MiB                      | `core/echo/echo/src/Blob.ts:106` — inline storage only                         |
| `MAX_EDGE_BLOB_SIZE`    | 50 MiB                     | `sdk/client/src/edge/edge-blob-backend.ts:22`                                  |
| S3 backend              | **none declared**          | `plugin-s3` declares no `maxSize`; the S3 single-`PUT` ceiling of 5 GB applies |

## 4. Accepted types

`isAcceptedMimeType` allows images, video and PDF only (`src/types/FileLimits.ts`). An assistant
writing a CSV or Markdown attachment is rejected today. Widening it is a separate decision; noted so
it is not discovered as a surprise.

## 5. Reaching it from a Claude cloud session

### The surface is closed — a new operation is the only way in

The MCP wire surface is **four tools, fixed**: `queryOperations`, `invokeOperation`, `loadSkill`
(`mcp-server/src/McpServer.ts:241`) plus a per-host `whoami`. The shared toolkit is not extensible,
and a host static tool that collides with one of the three throws at layer build
(`cli/src/commands/mcp/serve.ts:483-487`). Adding a fifth tool would mean duplicating it across two
repos — the EDGE host lives outside this one.

So an agent uploads by calling `invokeOperation` with the new operation's key. Nothing else changes.

### The call

```jsonc
{
  "key": "dxn:org.dxos.operation.file.createFromSource",
  "spaceId": "<required — no ambient default>",
  "input": { "source": { "type": "http", "url": "https://…" }, "name": "diagram.png" },
}
```

`input` is an opaque JSON object at the tool boundary (`McpServer.ts:225-233`); it is decoded twice
— once against the registry's JSON-Schema reconstruction, once against the live definition at the
host (`cli/src/commands/mcp/local-server.ts:158`).

### Where the operation actually runs — not the MCP worker

`mcp-space-service` (the EDGE MCP host, `composer.dxos.network` / `mcp.dxos.network`) does **not**
execute operations. `invokeOperation` is a pass-through RPC to the `OPERATION_SERVICE` binding
(`edge/packages/services/mcp-space-service/src/mcp/gateway.ts:58-61`); the MCP worker only attaches a
trace sink and re-qualifies refs. It constructs no `Client` at all.

Operations execute in **`operation-service`**
(`edge/packages/services/operation-service/src/entrypoint.ts`). That is the host that matters, and
its situation is:

|                    | `dx mcp serve` (CLI)                                                      | `operation-service` (EDGE)                                                                                               |
| ------------------ | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `Database.Service` | yes, via `Client`                                                         | **yes** — `EchoClient` built in `FunctionContext` (`compute-runtime/src/protocol.ts:171-177`), requires `contextSpaceId` |
| Blob backend       | `edge`, registered as default (`sdk/client/src/client/client.ts:540-544`) | **none — zero `registerBlobBackend` calls in the entire edge repo**                                                      |
| Effective storage  | edge, 50 MiB                                                              | **inline only, 4 MiB** (`blob-manager.ts:37`)                                                                            |
| R2 / blob bindings | n/a                                                                       | **none** — `operation-service/wrangler.jsonc:36-54` has only `DATA_SERVICE`, `QUEUE_SERVICE`, `AI_SERVICE`               |

So the answer to "can a cloud agent upload today?" is **yes, but only inline and only under 4 MiB**.
Asking for `storage: 'edge'` throws `BlobNotAvailableError{reason:'backend-not-registered'}`
(`blob-manager.ts:127`). This is better than "it fails" and worse than it looks: an assistant would
silently get inline blobs, which is exactly what the whole S3/R2 effort exists to avoid.

### The blob service that already exists

`edge/packages/services/blob-service` — an R2-backed store, binding `BLOB_STORE` →
`blob-store` / `-main` / `-labs` / `-staging` / `-production`
(`blob-service/wrangler.jsonc:46-157`).

Three properties worth knowing before wiring anything to it:

- **`POST /file/:key`, not `PUT`** (`blob-service/src/worker.ts:86`). The dxos-side
  `edge-blob-backend` already speaks this; a new writer must not assume S3 semantics.
- **Path-addressed, content-addressed only by convention.** The worker does
  `BlobStore.get().put(key, body)` and verifies nothing (`worker.ts:91`). The `ni:`/SHA-256
  discipline lives entirely in the client. Nothing server-side rejects a key that does not match its
  bytes.
- **No ingress of its own** (`wrangler.jsonc:29-30`) — reached only through the `edge` worker's
  `/blob/*` route (`edge/src/api.ts:97-105`), which strips the prefix.

### Wiring the two targets

Both requirements — EDGE's own store, and a customer R2 bucket — reduce to the same missing piece:
**`operation-service` needs a `BlobBackend` registered on the `EchoClient` that `FunctionContext`
builds**, the edge-side analogue of `client.ts:540-544`. Once that seam exists, which backend is
selected is the routing decision §2 already describes.

**Target 1 — EDGE blob store.** Add `services: [{ binding: 'BLOB_SERVICE', service: 'blob-service' }]`
to `operation-service/wrangler.jsonc` and register a backend that speaks `POST /file/:key` over that
binding. Preferred over giving `operation-service` its own `r2_buckets` entry for `blob-store*`:
one writer keeps the `ni:` convention in one place, and blob-service is binding-only by design.

**Target 2 — customer R2 bucket.** This is `plugin-s3`'s backend, and it is closer to portable than
it looks. Its bucket credential is an `AccessToken` in the space, and `operation-service` **has**
`Database.Service` — so the credential is reachable there. What blocks it is a dependency, not a
capability: `createCredentialResolver` currently takes a `Client` in order to build
`credentialsLayerFromDatabase` per space, and no `Client` exists on edge. Refactoring it to accept a
`Database.Service` directly (the browser path can supply one just as easily) makes the S3 backend
host-agnostic, and is the single change that would let an assistant upload land in the same bucket
the app writes to.

Note the signing code needs nothing: `sigv4.ts` is WebCrypto and `fetch`, both of which Workers
provide.

### Security finding, incidental but worth raising

Every blob-service route passes `skipAuth: true`
(`blob-service/src/worker.ts:32, 46, 63, 88, 98`), which short-circuits `edgeAuth` before any
credential check and emits `reportAuthSkipped`
(`edge/packages/sdk/hub-protocol/src/middleware.ts:315-328`). The dxos client dutifully pre-fetches
`/auth` and sends a verifiable presentation (`edge-http-client.ts:356-412`) — and blob-service
discards it. There is no identity check, no space scoping, and `DELETE /file/:key` is exposed on the
same terms.

Whether this is reachable by an untrusted caller depends on whether the `edge` worker's `/blob/*`
route authenticates in front of it, which I did not verify. **Worth confirming before this design
adds a second writer to that store** — not a blocker for the upload work, but it should not be
discovered later.

Convenient consequence for this design either way: an upload originating inside `operation-service`
needs no credentials to reach the blob endpoints. It could not present any if it had to — the MCP
worker holds an OAuth-derived identity, not a HALO verifiable presentation.

## Decisions

1. **Both arms ship, and the SSRF guard is extracted before either does.** The guard in
   `attach-image.ts` is already sound — https-only, blocked-host list, a streaming size cap that
   does not trust `content-length`, and a timeout — but `validateExternalUrl` and `isBlockedHost`
   are module-private, so reuse means extraction, not import. A copied guard is how the two
   drift and one of them silently stops blocking something. Prerequisite work item: lift them into a
   shared module, have `plugin-crm` import it, then build on it here.

2. **Widen `isAcceptedMimeType` to a small explicit allowlist**: add `text/plain`, `text/csv`,
   `text/markdown`, `application/json`. Nothing downstream blocks this — `FilePreview` already falls
   back to a download link for unrecognized types — so the gate is policy, not capability. It keeps
   its deny-by-default shape, and **`text/html` stays excluded on purpose**: a presigned URL serving
   stored HTML is an XSS vector on whatever origin serves it. That exclusion needs a comment saying
   so, or it gets "simplified" away later.

   Related but not settled by this: an assistant writing prose should arguably create a Document
   rather than a `text/markdown` blob. Widening the list does not decide where text belongs.

3. **Two storage targets, not one.** An assistant upload must be able to land either in EDGE's own
   blob store or in a customer R2 bucket. That makes storage a _routing_ decision rather than a
   default, and it is the same decision `resolveActiveStorage` already makes for the UI — so the
   operation should not take a storage argument from the model. Which bucket a space writes to is
   configuration, not something a caller chooses per upload; letting the model name a target would
   make it possible to write one space's file into another space's bucket.

   The open part is where that configuration lives for a headless host, since `plugin-s3`'s backend
   is a browser capability and the `Connection` holding the bucket credential is an ECHO object the
   host would have to read. See §5 and open question 5 — these are now the same question.

## Parked

- **Whether the fetch should go through `proxyFetchLegacy` on a headless host.** CRM proxies because
  it runs in a browser and needs CORS; an MCP host has no such constraint and could fetch directly,
  but the proxy keeps one egress point to reason about. Revisit once the questions below are settled.

3. **Answered by reading the edge repo: no backend is registered anywhere in it.** Operations run in
   `operation-service`, not in the MCP worker, and get inline-only 4 MiB storage. Both storage
   targets therefore depend on one prerequisite — registering a `BlobBackend` on the `EchoClient`
   that `FunctionContext` builds — with a `BLOB_SERVICE` binding for the EDGE store and a
   `Client`-free `plugin-s3` backend for the R2 bucket. Detail in §5.

## Open questions

4. Should assistant uploads be attributed — a tag or field recording that an agent created it — so
   they are distinguishable from user uploads after the fact?
5. Should `plugin-s3`'s backend be reachable from headless hosts, so an assistant upload lands in
   the same bucket the app writes to?
