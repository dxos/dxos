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

4. **The storage backend is decoupled from `Client` and reachable headless — but it is not
   "plugin-s3's backend".** The right framing is a general-purpose file service, either extending
   `blob-service` or sitting beside it, of which an S3/R2 target is one implementation. `plugin-s3`
   happens to hold the working S3 code today; that code should move to where any host can register
   it rather than remaining a browser plugin capability.

   The blocker is one dependency: `createCredentialResolver` takes a `Client` purely to build
   `credentialsLayerFromDatabase` per space. `operation-service` has no `Client` but does have
   `Database.Service`, which is all the lookup needs. Swap the parameter and the backend is
   host-agnostic; `sigv4.ts` already needs nothing beyond WebCrypto and `fetch`.

5. **The fetch on a headless host does NOT go through the CORS proxy.** See below — the proxy exists
   for browsers, and `operation-service` has no CORS constraint to solve.

## The edge CORS proxy — where it does and does not apply

`proxyFetchLegacy` (`core/mesh/edge-client/src/cors-proxy.ts`) routes through
`cors.dxos.network`, implemented at `edge/packages/services/cors-proxy/src/main.ts`. It strips
`host` from the forwarded request (`main.ts:23`) and supports overriding browser-privileged headers
via an `x-cors-proxy-` prefix, which is how the client relocates `Authorization`
(`cors-proxy.ts:15-22`).

**It would technically work for SigV4.** Because the proxy strips `Host` and `fetch` sets it from
the target URL, a request signed for the bucket host arrives at the bucket with a matching `host`
header, and the signature verifies. Header-auth requests are safe; **presigned URLs are not** —
`parseTargetUrl` re-serializes the query string (`main.ts:113-118`), and re-encoding
`X-Amz-Signature` and friends can invalidate them.

Three separate questions, three different answers:

1. **The upload operation's `http` arm — do not proxy.** It runs in `operation-service`, which is
   not a browser and has no CORS constraint. `plugin-crm` proxies only because it runs in the page.
   Direct `fetch` behind the extracted SSRF guard.
2. **`plugin-s3`'s browser data path — do not proxy either, despite the temptation.** It would
   remove the bucket-CORS requirement entirely, which is the single biggest operational friction in
   the plugin. But `cors.dxos.network` is an **open** proxy (`origin: '*'`, any target host), so
   every signed request and every uploaded byte of a customer's file would pass through it. The
   client comment marks it TEMPORARY pending an authenticated `/proxy/*` route on edge — and no such
   route exists yet (no `/proxy` in `edge/src/api.ts`). Revisit if that route ships; routing
   credentialed traffic through an open proxy is not a trade to make in the meantime.
3. **Bucket CORS is needed for less than it appears.** `getUrl` returns a presigned URL that
   `FilePreview` puts in a plain `<img src>` / `<video src>` / `<iframe src>` with no `crossorigin`
   attribute — **those loads are not CORS-gated at all**. Only `fetch` is, which means the bucket
   policy is required for uploads and programmatic reads, and _not_ for rendering. A read-only
   viewer of a shared object needs no bucket CORS policy whatsoever. This is worth stating in the
   plugin README, which currently implies the policy is needed for everything.

4. **Answered by reading the edge repo: no backend is registered anywhere in it.** Operations run in
   `operation-service`, not in the MCP worker, and get inline-only 4 MiB storage. Both storage
   targets therefore depend on one prerequisite — registering a `BlobBackend` on the `EchoClient`
   that `FunctionContext` builds — with a `BLOB_SERVICE` binding for the EDGE store and a
   `Client`-free `plugin-s3` backend for the R2 bucket. Detail in §5.

5. **Assistant uploads are tagged**, rather than carrying a new field on `File`. The question anyone
   asks after an agent writes to a space is "what did it put here?", and a tag answers it with a
   query. The trace feed technically records the invocation, but that is unusable when you are
   holding a file and want to know where it came from. A tag also leaves a released type unchanged
   for a concern that is not intrinsic to files.

   Implementation detail that is not free: `Obj.addTag` takes a `Ref.Ref<Tag.Tag>`, not a string
   (`core/echo/echo/src/Obj.ts:671`), so the tag is an object needing stable identity per space — and
   there is **no find-or-create helper in the repo** (nothing matches `findOrCreateTag`/`ensureTag`).
   The operation must resolve or create it, and two concurrent uploads into a fresh space must not
   each mint one. Worth a small shared helper rather than an inline query, since the next feature
   that tags something will need the same thing.

## Tracked, not decided in this pass

- **Attribution of assistant uploads** (was question 4). Deferred deliberately, not dropped. When it
  is picked up, note that `Obj.addTag` takes a `Ref.Ref<Tag.Tag>` rather than a string
  (`core/echo/echo/src/Obj.ts:671`), there is no find-or-create helper in the repo, and two
  concurrent uploads into a fresh space must not each mint a tag object.

## 6. Two products, and why that settles the service question

The managed store and the customer bucket are **different products**, and conflating them produced a
wrong recommendation earlier in this document's history, worth recording so it is not reached again:

- **`blob-service` is "we store your files."** DXOS's own R2 buckets, DXOS's own credentials.
- **The S3/R2 backend is bring-your-own-bucket**, for users who already have an endpoint.

An earlier draft argued for a new file service on **auth** grounds: today the secret access key is
replicated into the space, so every space member can read and write the bucket. That argument
**inverts** once the two products are separated. For a BYO bucket:

1. The credential is the user's own key to the user's own bucket, held in the user's own space. The
   members who can read it are the ones who can already read every object in that bucket.
2. The alternative is worse. A service that mints presigned URLs must **hold customer bucket
   credentials server-side**, making DXOS custodian of keys to infrastructure it does not own — a
   larger liability than the current arrangement, and one some customers would simply refuse.

So the credential stays client-side for BYO, and a credential-holding service makes sense only for
the managed product, where the buckets are DXOS's already. What remains for BYO is **purely
headless reachability**, which needs no new service — see step 5 below.

## Build order

Each step is usable on its own, and each unblocks the next.

1. ~~**Extract the SSRF guard**~~ — **done.** `@dxos/util`'s `safe-fetch`: `validateExternalUrl`,
   `isBlockedHost`, and `safeFetchBytes` with the cap enforced while streaming. `plugin-crm` imports
   it rather than keeping its copy, and it now has the tests it never had.
2. ~~**`FileOperation.CreateFromSource`** + the widened MIME allowlist + the skill entry~~ —
   **done.** Works on the CLI host, and on edge at inline sizes.
3. ~~**The headless backend seam**~~ — **done.** `FunctionContext` registers a `BlobBackend` on the
   `EchoClient` it builds, so a handler running on edge is no longer limited to inline storage.
4. **EDGE store target** — `BLOB_SERVICE` binding on `operation-service`, backend speaking
   `POST /file/:key`. Lives in the edge repo, so it is a separate change by necessity. Only buys the
   managed store, which browser clients can already reach.
5. ~~**R2 target**~~ — **done.** The protocol code is `@dxos/echo-client` under its `./blob-s3`
   export, its database bindings are `createS3Host` in `compute-runtime`, and `plugin-s3` keeps only
   the capability wrapper and the connector.

   **Two corrections to what this document first proposed**, both worth knowing before attempting
   anything similar:

   - **It is not a new package.** A new package must be `private: true`, and a public package may
     not depend on a private one — `compute-runtime`, which imports the backend to register it, is
     published. Publishing the new package instead fails the never-published gate, which needs npm
     trusted publishing configured. `echo-client` is the right home regardless: it already owns the
     blob manager and the registry the backend registers into. Its own export subpath keeps the
     signer out of anything that does not use S3.
   - **The registration is in `compute-runtime`, not `functions-runtime-cloudflare`.** The latter
     does not import the former at all, so a call site there would have registered on nothing. The
     cycle that motivated the original suggestion is avoided differently: the bindings live beside
     `credentialsLayerFromDatabase`, which they need, so the storage code never imports upward.

## Open questions

- **Is `blob-service`'s `skipAuth: true` intentional?** Flagged in §5. Not a blocker for this work,
  but it should be answered before a second writer is pointed at that store.
- **Should the general-purpose file service extend `blob-service` or sit beside it?** Decision 5
  settles that an S3/R2 target must be one implementation among several; it does not settle whether
  the seam lives in the existing worker or a new one.
