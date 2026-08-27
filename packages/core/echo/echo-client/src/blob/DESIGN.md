# Blob storage naming (`edge`/`ni:` → `blob`)

The DXOS-hosted blob store is registered under the storage name `edge` and emits `ni:` URIs. Both
names are wrong in a way that has cost real design time, and both are persisted on existing `Blob`
objects, so correcting them is a migration rather than a rename.

## The two problems

**`edge` claims the platform for one storage target.** EDGE is the whole backend architecture; the
blob service is one worker inside it. `Blob.Storage.edge` reads as "the EDGE backend" when it means
"the store DXOS hosts for you". Naming it after the current implementation (`blob-service`) would be
no better — it would go stale the moment the service is re-implemented.

**`ni:` names an addressing style, not a backend.** `BlobManager` dispatches reads on a
`Map<scheme, backend>` ([blob-manager.ts](./blob-manager.ts)), so a scheme is functionally a backend
selector. Every other scheme behaves that way — `s3:`, `wnfs:` — and `ni:` is the one entry that
describes a property instead of an owner. That is the entire reason a hypothetical IPFS backend
raises a collision question: IPFS is also content-addressed, so it has a claim on `ni:` that it
would never have on a scheme naming its owner.

The RFC 6920 conformance being given up is unrealized value: nothing outside DXOS consumes these
URIs today, so the spec buys option value rather than actual interop.

## Decision

**Scheme names the backend. The DXOS-hosted store becomes `blob`.**

| Custody                 | Storage name          | Scheme  | Example reference                                                    |
| ----------------------- | --------------------- | ------- | -------------------------------------------------------------------- |
| In the object           | `inline`              | none    | bytes on the object (`_tag: 'inline'`)                               |
| DXOS-hosted             | `blob` (today `edge`) | `blob:` | `blob:///sha-256;UyaQNQIUxQKgg1jVMKMbg1Yr8Rrb2Y3RaOx2N0mVJhc`        |
| Public network          | `ipfs` (hypothetical) | `ipfs:` | `ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi` |
| Bring-your-own endpoint | `s3`                  | `s3:`   | `s3://media.abc123.r2.cloudflarestorage.com/SPACEID/deadbeef`        |
| Space-local / peer      | `wnfs`                | `wnfs:` | `wnfs://spaces/<spaceId>/files/<cid>`                                |

Custody is the axis that separates these, not addressing — `blob` and `ipfs` are both
content-addressed, so "content-addressed" cannot discriminate between them.

### Why the triple slash

`blob:///sha-256;<base64url>`, mirroring `ni:///` exactly.

DOM object URLs are `blob:https://origin/uuid` — opaque, with no `//` after the colon. `blob:///…`
is therefore structurally distinct from them at a glance and to a parser, while `blob:sha-256;…`
would be shape-identical. Both forms appear in this codebase, since `BlobBackend.getUrl` returns DOM
object URLs, so telling them apart matters.

The empty authority is also the honest statement: there is no host, because a digest does not name a
location.

The algorithm field is carried over from RFC 6920 deliberately — it costs nothing and means a future
digest change does not need a new scheme.

## Known limitation

This decision entrenches scheme = backend identity. The digest stays _semantically_
location-independent while becoming _syntactically_ owned, so one reference resolvable from several
stores is no longer expressible in the URI alone. Two features want that:

- the local cache blocked in [edge-blob-backend.ts](../../../../sdk/client/src/edge/edge-blob-backend.ts),
  which needs to serve a `blob:` reference from disk before reaching the network;
- an IPFS mirror of DXOS-hosted content.

Both would need a resolution-order mechanism — several backends expressing interest in one
reference — rather than falling out of a shared scheme. The alternative considered was a universal
`blob://<store>/<ref>` scheme dispatching on authority, which gives multi-store resolution for free
but requires a `BlobManager` contract change now for a feature that is speculative. Revisit if
either feature becomes real.

## Call sites

Contained — nine source files.

| File                                                                                                                                                                                                       | Kind         | Notes                                                                                                                              |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| [Blob.ts](../../../echo/src/Blob.ts)                                                                                                                                                                       | API          | `Storage = { inline, edge }` and `Scheme = { ni }`. Both constants change; `Scheme.ni` is retained read-side.                      |
| [ni-uri.ts](./ni-uri.ts)                                                                                                                                                                                   | Encoding     | `fromDigest`/`fromDigestHex` emit `ni:///${ALG};…`; `decode` rejects non-`ni:`. Becomes the dual-read boundary.                    |
| [blob-manager.ts](./blob-manager.ts)                                                                                                                                                                       | Registry     | `#defaultStorage` initialises to `Storage.inline`; no `ni:` knowledge of its own.                                                  |
| [edge-blob-backend.ts](../../../../sdk/client/src/edge/edge-blob-backend.ts)                                                                                                                               | Backend      | Declares `schemes: [Blob.Scheme.ni]`, calls `fromDigestHex`/`parseNiUri`. Must accept both schemes on read, emit `blob:` on write. |
| [client.ts](../../../../sdk/client/src/client/client.ts)                                                                                                                                                   | Registration | Registers under `Blob.Storage.edge` with `{ default: true }`.                                                                      |
| [edge-backend.ts](../../../../../plugins/plugin-file/src/capabilities/edge-backend.ts)                                                                                                                     | Descriptor   | Settings-UI entry naming the backend. User-visible label.                                                                          |
| [ni-uri.test.ts](./ni-uri.test.ts), [blob.test.ts](./blob.test.ts), [Blob.test.ts](../../../echo/src/Blob.test.ts), [edge-blob-backend.test.ts](../../../../sdk/client/src/edge/edge-blob-backend.test.ts) | Tests        | Pin the literal strings `'edge'`, `'ni'`, and `ni:///sha-256;3q2-7w`.                                                              |

`packages/apps/composer-app/out/` hits are build output, not sources.

## Migration

Persisted data is the constraint: existing `Blob` objects hold `ni:` URIs and existing spaces hold
the storage name `edge`. Neither can be rewritten in place across peers that may be offline.

1. **Read both, write one.** The hosted backend declares `schemes: ['blob', 'ni']` and emits `blob:`
   for new writes. `ni:` stays supported read-side indefinitely — it is two characters of
   compatibility, not a deprecation to chase.
2. **Alias the storage name.** `Blob.Storage.blob = 'blob'`, with `'edge'` resolving to the same
   registered backend so existing space settings keep working.
3. **Do both renames together.** The storage name and the scheme are stored on the same objects, so
   splitting them into two migrations doubles the compatibility surface for no benefit.
4. **Leave the plugin descriptor label to last** — it is user-visible text and worth deciding
   separately from the wire format.

Not started; no code in this repository has been changed for it yet.
