# Audit: remaining protobuf.js dependencies and cost of migrating to buf

Status: audit only — no code changes. Counts taken from `main` at the time of writing.

## Summary

`protobufjs` is a direct dependency of exactly three packages:

| Package                   | Role                                                                     | Source LOC |
| ------------------------- | ------------------------------------------------------------------------ | ---------- |
| `@dxos/codec-protobuf`    | runtime: codecs, substitutions, `Stream`, service descriptors            | 1,599      |
| `@dxos/protobuf-compiler` | build-time codegen (`build-protobuf`) producing `src/proto/gen`          | 1,368      |
| `@dxos/effect-proto`      | protobuf descriptor → Effect Schema conversion (used by `react-ui-form`) | 415        |

Everything else depends on protobuf.js transitively, through generated types imported from
`@dxos/protocols/proto/*` and through `@dxos/codec-protobuf` at runtime.

Codegen is **not** the blocker: `@dxos/protocols` already runs `buf generate` (`buf.gen.yaml`,
`protoc-gen-es`) over the _same_ `src/proto` tree in its `gen-buf` task, so a `@bufbuild/protobuf`
message type already exists for all 220 messages in the 51 `.proto` files (3,737 LOC). The two
generators run side by side and both outputs are consumed today.

## Current exposure

| Surface                                                                  | Count                        |
| ------------------------------------------------------------------------ | ---------------------------- |
| `.ts`/`.tsx` files importing `@dxos/protocols/proto/*` (protobuf.js gen) | 275 files / 409 declarations |
| Files importing `@dxos/protocols/buf/*` (already migrated)               | 25 (dxos) + 85 (edge)        |
| Files importing `@dxos/codec-protobuf`                                   | 39                           |
| `schema.getCodecForType(...)` call sites                                 | 47                           |
| `Stream` imports from `@dxos/codec-protobuf`                             | 26                           |

Counted over git-tracked `*.ts`/`*.tsx` only, matching `import`/`export … from '@dxos/protocols/proto/…'`
declarations (not raw mentions of the path, which come to 464 lines). How many of those declarations
touch a _substituted_ field is not measured here — it needs per-field analysis, and it is the number
that actually sizes the sweep.

Heaviest legacy consumers (files importing `@dxos/protocols/proto/*`):
`sdk/client-services` (83), `core/mesh` (50), `core/halo` (28), `sdk/client` (23),
`devtools/devtools` (19), `plugins/plugin-space` (11).

Most-imported legacy modules: `dxos/client/services` (106), `dxos/halo/credentials` (94),
`dxos/config` (36), `dxos/echo/metadata` (31), `dxos/echo/feed` (22).

`dxos/edge` adds one direct dependent (`@dxos/hub-protocol` → `@dxos/codec-protobuf`) plus
17 files still importing `@dxos/protocols/proto/*`; its newer code already uses
`@dxos/protocols/buf/*` for credentials, keys, query and messenger.

## What actually has to be replaced

Codegen is solved; the cost is concentrated in four runtime behaviours protobuf.js gives us and
`@bufbuild/protobuf` does not:

1. **Substitutions.** `packages/core/protocols/src/proto/substitutions.ts` rewrites
   `dxos.keys.PublicKey` → `PublicKey`, `dxos.keys.PrivateKey` → `Buffer`,
   `dxos.echo.timeframe.TimeframeVector` → `Timeframe`, plus `Any`, `Struct` and `Timestamp`
   handling. Generated buf types are plain messages, so any of the 409 declarations that touches
   a substituted field sees a different shape (`{ data: Uint8Array }` instead of a
   `PublicKey` instance). This is the bulk of the mechanical work.
2. **Credential signature stability.** `credentials/src/credentials/signing.ts` signs
   `json-stable-stringify` of the _substituted object_, not the wire bytes. Any change to the
   decoded object shape (Timestamp as `Date` vs `{seconds,nanos}`, `PublicKey` instance vs
   `{data}`) changes the signed payload and invalidates every existing credential. A compat
   shim that reproduces the current JSON exactly is mandatory, and
   `presentations/json-encoding.test.ts` already documents the divergence
   ("protobuf.js encodes timestamp as object").
3. **Persisted data.** `dxos.halo.keyring.KeyRecord` (SQLite keyring),
   `dxos.echo.query.Heads` (SQLite heads store), `dxos.echo.metadata`, `dxos.echo.feed`
   are stored on disk. Wire format is compatible, but decode-side object shape is not.
4. **Service descriptors and `Stream`.** `@dxos/rpc` (`ServiceBundle`, `createProtoRpcPeer`,
   ~60 call sites) is built on protobuf.js `ServiceDescriptor`; 18 `service {}` blocks with 36
   rpc methods. `Stream` is a bespoke type re-exported from `codec-protobuf` in 26 places.

## Interaction with the in-flight effect-rpc migration

The client-services RPC layer is already being moved off protobuf.js _service descriptors_ onto
`effect/unstable/rpc` with hand-authored `effect/Schema` payloads
(`packages/core/protocols/src/{IdentityService,SpacesService,QueryService,…}.ts`,
`scripts/gen-service-rpcs.ts` deliberately has an empty `SERVICES` list). But those modules keep
protobuf.js as the _payload codec_: `protoMessage()` in `service-rpc.ts` wraps
`schema.getCodecForType(...)` and is used at 64 sites, and `serviceError` encodes
`dxos.error.Error` the same way.

So the two directions compete. `protoMessage()` is the single chokepoint where protobuf.js
enters the new RPC stack — re-pointing it at `@bufbuild/protobuf` is a small, high-leverage
change, but only if the substituted-shape problem (1) is solved first.

## Estimate

Assumes no behaviour change and no proto edits; each phase independently landable.

| Phase | Work                                                                                                                                                                                                                | Estimate    |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| 0     | Shape-compat layer: buf-based encode/decode that reproduces the current substituted object shape (PublicKey/PrivateKey/Timeframe/Any/Struct/Timestamp), with round-trip and byte-equality tests against protobuf.js | 1–1.5 weeks |
| 1     | Re-point `protoMessage()` / `serviceError` at buf; keep protobuf.js for everything else                                                                                                                             | 2–3 days    |
| 2     | Persisted codecs (keyring, heads store, metadata, feed) + credential signing compat, incl. fixture tests on existing data                                                                                           | 1–1.5 weeks |
| 3     | Replace `ServiceDescriptor`/`createProtoRpcPeer` for the remaining non-effect services (mesh/teleport, iframe, bridge, agentmanager); move `Stream` out of `codec-protobuf`                                         | 1.5–2 weeks |
| 4     | Mechanical rewrite of 409 `@dxos/protocols/proto/*` imports → `@dxos/protocols/buf/*` (largely codemod-able; the enum and `optional`/default-value differences are not)                                             | 2–3 weeks   |
| 5     | `@dxos/effect-proto` on buf descriptors (`react-ui-form`)                                                                                                                                                           | 3–5 days    |
| 6     | Delete `protobuf-compiler`, the `prebuild` task, `substitutions.ts`, `codec-protobuf`; drop `protobufjs` from the catalog; update `dxos/edge` (`hub-protocol`, `db-service`)                                        | 3–5 days    |

**Total: roughly 7–10.5 engineer-weeks**, of which phase 4 is the long tail and the only phase that
touches most of the repo. Phases 0–2 (~3 weeks) deliver the actual de-risking; stopping after
phase 1 already removes protobuf.js from the new RPC stack.

Main risks, in order: credential signature stability (2), decoded-shape drift silently changing
behaviour at 409 sites, and enum/default-value semantics differing between the two generators.

## Ranked threads (risk × complexity)

Independently landable threads, lowest → highest risk×complexity. Six have a dependency, in three
groups: `#7` and `#9a`–`#9d` on the shape-compat layer (`#3`), and `#8` on the `Stream` extraction
(`#6`). Within `#9`, each slice is ordered by blast radius: 9a → 9b → 9c → 9d.

| #   | Thread                                  | Scope                                                                                       | Risk        | Complexity | Notes                                                                                                                                                                                                                               |
| --- | --------------------------------------- | ------------------------------------------------------------------------------------------- | ----------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `@dxos/effect-proto` removal            | 2 files                                                                                     | very low    | very low   | The only real consumer is `react-ui-form`'s `ObjectTree.stories.tsx` (`parseProto`) — a storybook. Deletes an entire protobuf.js dependent.                                                                                         |
| 2   | Test/example protos                     | `tools/protobuf-test`, `codec-protobuf/test`, `protobuf-compiler/test`, `example/testing/*` | very low    | low        | No persisted data, no signatures. Doubles as the conformance harness for #3.                                                                                                                                                        |
| 3   | Shape-compat layer                      | new module in `@dxos/protocols`                                                             | low         | high       | Buf encode/decode reproducing the substituted shapes (PublicKey, PrivateKey, TimeframeVector, Any, Struct, Timestamp) plus byte/JSON-equality tests against protobuf.js. Nothing switches over, so risk stays low; gates #7 and #9. |
| 4   | `dxos.config`                           | 33 files                                                                                    | low         | low–medium | Read-mostly, not persisted, not signed. Good codemod pilot for enum and default-value differences.                                                                                                                                  |
| 5   | devtools                                | 20 files                                                                                    | low         | low–medium | Diagnostic-only; regressions are visible and harmless. Already on effect-rpc (verified — see below), so this is a type-import sweep that rides on #7, not an RPC-seam exercise.                                                     |
| 6   | `Stream` extraction                     | 26 import sites                                                                             | low         | medium     | Move `Stream` out of `codec-protobuf` into its own package; unblocks deleting that package.                                                                                                                                         |
| 7   | `protoMessage()` / `serviceError` → buf | 64 sites, 1 file                                                                            | medium      | low        | The chokepoint: re-points the whole effect-rpc stack off protobuf.js in one file. Highest leverage per line changed, but a shape mismatch breaks every client service at once.                                                      |
| 8   | Remaining `ServiceDescriptor` RPC       | mesh/teleport, iframe, bridge, agentmanager — 18 services / 36 rpcs, ~60 sites              | medium–high | high       | Cross-peer wire compatibility: a mismatch breaks replication between versions, not just a local call. Sequence after #6.                                                                                                            |
| 9a  | keyring `KeyRecord`                     | `halo/keyring/src/{keyring,sqlite-keyring}.ts`                                              | medium      | low        | One message, two codec sites, local SQLite only. Smallest persisted slice — do it first to validate #3 against real on-disk rows.                                                                                                   |
| 9b  | `echo.query.Heads`                      | `echo-host/src/automerge/sqlite-heads-store.ts`                                             | medium      | low        | One message, one codec site. Rebuildable from Automerge if a migration goes wrong, which caps the downside.                                                                                                                         |
| 9c  | `echo/metadata` + `echo/feed`           | 31 + 22 declarations across echo-host, feed-store, client-services                          | medium–high | medium     | Broad on-disk state with no cheap rebuild path; needs a fixture profile per storage version.                                                                                                                                        |
| 9d  | credentials signing/verification        | `halo/credentials/src/credentials/*`, 94 declarations                                       | highest     | high       | `signing.ts` stringifies the _substituted object_, so any shape drift invalidates every existing credential. Do last, behind 9a–9c, with fixtures of real signed credentials from released versions.                                |

### Not a codemod: `dxos.config` (#4)

`packages/sdk/config/src/index.ts` re-exports `@dxos/protocols/proto/dxos/config` wholesale — as
`defs` (the generated namespace, whose enums are numeric-valued objects) and as the public
`ConfigProto` type. Every `Runtime.Client.ServicesMode.DEDICATED_WORKER`-style reference in the
apps therefore reads through that re-export. buf renders those enums differently, so switching
`@dxos/config` to buf changes its public surface rather than just its imports. #4 needs a decision
on that surface first and is re-rated high complexity; it is not the cheap codemod pilot the first
draft of this audit assumed.

### #5 cannot land before #7

`protoMessage()` is typed `Schema.Codec<TYPES[K], Uint8Array>`, where `TYPES` comes from the
protobuf.js `src/proto/gen` barrel — so every value the effect-rpc services hand devtools is
protobuf.js-shaped. Re-pointing devtools' type imports at `@dxos/protocols/buf/*` while that
holds would type buf shapes over protobuf.js values, and the only way to compile it is the casts
the repo forbids. #5 is therefore ordered strictly after #7, not merely helped by it.

### Where buf and protobuf.js bytes actually differ

Measured while building the compat layer, so the ranking above understates #9c/#9d slightly:

1. **Unset non-optional message fields.** protobuf.js materialises them as empty submessages; buf
   omits them. `dxos.client.services.Invitation` with no `swarm_key` gains a `42 02 0a 00` run
   under protobuf.js and nothing under buf. Both decode to the same value, so this is wire- but
   not byte-compatible — byte equality holds only once every non-optional message field is set.
   It does not affect `#9a`/`#9b`, whose messages have no message-typed fields.
2. **Pre-epoch `Timestamp`.** protobuf.js computes `nanos` as `ms % 1000 * 1e6`, which is negative
   before 1970 and decodes a second early (`new Date(-1)` round-trips to `…:58.999Z`). The compat
   layer canonicalises instead, so it diverges from the legacy codec here — deliberately, since
   reproducing the bug would carry a value corruption into new code.
3. **`google.protobuf.Any`** is unsupported and throws.

### Scheduling status

Landed: `#1` (effect-proto deleted), `#3` (shape-compat layer plus a conformance harness), `#9a`
(keyring `KeyRecord`), `#9b` (`echo.query.Heads`). `#2` is still open: the harness that `#3`
needed was built against real dxos messages, so nothing under `tools/protobuf-test` or the
`example/testing` protos has moved yet.

Blocked, with the blocker established above rather than assumed: `#4` needs a decision on
`@dxos/config`'s public surface; `#5` needs `#7` first. `#9c` and `#9d` remain, in that order, and
`#9d` additionally needs `Any` support in the compat layer, since credentials carry
`google.protobuf.Any`.

Still unscheduled: `#2`, `#6`, `#7`, `#8`.

### Verified: devtools is already on effect-rpc

`packages/devtools/devtools` imports its service types from `@dxos/protocols/rpc` and contains no
`createProtoRpcPeer`, `ServiceBundle` or `ServiceDescriptor` call site; `DevtoolsHost.ts` is an
`effect/unstable/rpc` `RpcGroup`. What still binds it to protobuf.js is the payload codec behind
`protoMessage()` plus its own `@dxos/protocols/proto/*` type imports — which is why `rpc.ts` is
deliberately kept out of the package barrel ("they transitively load the protobufjs-backed proto
codec"). So #5 does not exercise the RPC seam, and #8 is where the remaining
`ServiceDescriptor`-based services actually live.

The 409-declaration codemod is not a thread of its own: it decomposes into #4, #5 and per-package
slices behind #3 — a rolling sweep rather than a milestone.

Sequencing notes: `dxos/edge` (`hub-protocol`, `db-service`) follows whatever `@dxos/protocols`
publishes and should not be scheduled separately; deleting `protobuf-compiler`/`codec-protobuf`
and dropping `protobufjs` from the catalog is unblocked only once EVERY consumer has moved:
`#1` (done), `#4`, `#5`, `#6`, `#7`, `#8` and all of `#9a`–`#9d`. `#4`, `#5` and `#7` are easy to
overlook here because they read protobuf.js through generated types and `protoMessage()` rather
than through `codec-protobuf` directly, but they are consumers all the same.
