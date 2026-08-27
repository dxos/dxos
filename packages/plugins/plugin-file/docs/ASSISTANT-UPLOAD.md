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

### Which host, and whether it can store anything — the decisive question

The two MCP hosts are **not equivalent for this operation**:

|                | `dx mcp serve` (CLI)                                                      | EDGE worker                         |
| -------------- | ------------------------------------------------------------------------- | ----------------------------------- |
| Has a `Client` | yes                                                                       | **no** (`space-tools.ts:35-38`)     |
| Blob backend   | `edge`, registered as default (`sdk/client/src/client/client.ts:540-544`) | **no evidence of one in this repo** |
| Session spaces | every visible space (`local-server.ts:87-90`)                             | the OAuth grant's spaces            |

**On the CLI host this works today.** A `dx mcp serve` process configured with an edge URL
(`cli/config/config-dev.yml:18-19`) registers the edge blob backend as default, so
`File.fromBytes` with no explicit storage writes to edge over plain `fetch` — nothing about it is
browser-specific. Two caveats: it **requires a HALO identity**, since the blob endpoint is
authenticated (`client.ts:514-530`), and it is **online-only with no local cache**
(`edge-blob-backend.ts:27-29`).

**On the EDGE host it is unproven and probably absent.** That worker has no `Client` at all, and
this repo shows no blob backend registered in it. Before promising a cloud agent can upload,
someone must confirm what storage exists inside the EDGE MCP worker — otherwise the operation will
be listed by `queryOperations` and fail at `Blob.fromBytes`.

### So the recommended cloud shape

A Claude cloud session reaches DXOS through the **EDGE** MCP host, which is exactly the host whose
storage is unproven. Two options, in order of preference:

1. **Confirm or add a blob backend in the EDGE MCP worker.** That worker already sits next to EDGE
   blob storage, so this is likely a small wiring change in the edge repo — but it is out of tree
   and cannot be verified from here. This is the prerequisite for a genuine cloud upload.
2. **Route through a CLI host instead.** A cloud sandbox that runs `dx mcp serve` locally (with a
   HALO identity) gets a working `edge` backend immediately, with no cross-repo change. Suitable for
   a developer sandbox; not for a hosted Claude connector.

Note the interaction with `plugin-s3`: the S3 backend is contributed by a **browser plugin**
capability and is not present in a CLI or EDGE process. An assistant upload will therefore land in
**edge** storage, not in the S3 bucket, even when the browser app has S3 selected. Making
assistant uploads honour the S3 backend is a separate piece of work — the backend registration would
have to move somewhere a headless host can reach.

## Open questions

1. Ship `http` in v1, or start base64-only with a small cap until the SSRF guard is reviewed?
   Base64-only is strictly safer and covers the generated-image case, which is the likeliest first
   use.
2. Does `isAcceptedMimeType` need widening for assistant use (text, CSV, JSON)?
3. **Does the EDGE MCP worker have any blob backend?** Blocking for the cloud path; answerable only
   in the edge repo.
4. Should assistant uploads be attributed — a tag or field recording that an agent created it — so
   they are distinguishable from user uploads after the fact?
5. Should `plugin-s3`'s backend be reachable from headless hosts, so an assistant upload lands in
   the same bucket the app writes to?
