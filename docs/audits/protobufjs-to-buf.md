# Plan: migrating off protobuf.js to buf

Where the migration stands and what is left. Counts are measured, not estimated; every "blocked"
claim below is established in code rather than assumed. The findings that shaped the plan are kept
at the bottom — read those before picking up a thread.

## Status

| #   | Thread                                  | State       | Notes                                                                    |
| --- | --------------------------------------- | ----------- | ------------------------------------------------------------------------ |
| 1   | `@dxos/effect-proto` removal            | **done**    | Package deleted; storybook rewritten on a hand-authored Effect Schema.   |
| 2   | Test/example protos                     | todo        | Untouched — `#3`'s harness was built against real dxos messages instead. |
| 3   | Shape-compat layer                      | **done**    | `@dxos/protocols/buf-shape-compat` + conformance harness (5 tests).      |
| 4   | `dxos.config`                           | **blocked** | Needs a decision on `@dxos/config`'s public surface — see findings.      |
| 5   | devtools                                | **part**    | Enum imports moved; the rest needs `#7` first.                           |
| 6   | `Stream` extraction                     | **done**    | Moved to `@dxos/async`; generator emits it from there.                   |
| 7   | `protoMessage()` / `serviceError` → buf | todo        | The chokepoint. Unblocks `#5` and most of the import sweep.              |
| 8   | Remaining `ServiceDescriptor` RPC       | todo        | Cross-peer wire compatibility; sequence after `#6` (now done).           |
| 9a  | keyring `KeyRecord`                     | **done**    | No substituted fields; wire format unchanged, asserted byte-for-byte.    |
| 9b  | `echo.query.Heads`                      | **done**    | Same; also dropped the workerd lazy-codec workaround.                    |
| 9c  | `echo/metadata` + `echo/feed`           | todo        | Needs fixture profiles per storage version.                              |
| 9d  | credentials signing/verification        | todo        | Highest risk; additionally needs `Any` support in the compat layer.      |

**Next up, in order:** `#7` (unblocks `#5` and the sweep) → rest of `#5` → `#9c` → `#8` → `#9d`.
`#2` and `#4` are independent and can slot in anywhere; `#4` needs the API decision first.

Deleting `protobuf-compiler`/`codec-protobuf` and dropping `protobufjs` from the catalog is the
last step, and needs every thread above done.

Before starting any thread, read **Findings** at the bottom: the five generator divergences are
what make the mechanical-looking parts non-mechanical, and two of them (`Any`, nested enums) are
hard gates rather than nuisances. Two habits earned their keep here and are worth repeating:
assert byte **and** shape equality against the protobuf.js codec for anything persisted, and when
a switch looks safe, attempt it and let `tsc` rule rather than reasoning about it — that is how
both the nested-enum gate and the `Buffer`-view divergence surfaced.

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

## Remaining estimate

Per open thread, assuming no behaviour change and no proto edits.

| Thread | Work                                                                                                 | Estimate    |
| ------ | ---------------------------------------------------------------------------------------------------- | ----------- |
| 7      | Re-point `protoMessage()` / `serviceError` at buf (64 sites, one file)                               | 2–3 days    |
| 5      | Rest of devtools, behind `#7` — message type imports, the nested enum, `JsonView`                    | 2–3 days    |
| 9c     | `echo/metadata` + `echo/feed`, with a fixture profile per storage version                            | 1 week      |
| 8      | `ServiceDescriptor`/`createProtoRpcPeer` for mesh/teleport, iframe, bridge, agentmanager             | 1.5–2 weeks |
| 9d     | Credentials signing/verification, incl. `Any` support in the compat layer                            | 1–1.5 weeks |
| 4      | `dxos.config`, after the `@dxos/config` API decision                                                 | 1–2 weeks   |
| 2      | Test/example protos                                                                                  | 2–3 days    |
| —      | Import sweep of the remaining `@dxos/protocols/proto/*` declarations, behind `#7`                    | 2–3 weeks   |
| —      | Delete `protobuf-compiler`, `codec-protobuf`, `substitutions.ts`; drop `protobufjs` from the catalog | 3–5 days    |

**Remaining: roughly 8.5–12.5 engineer-weeks**, of which the import sweep is the long tail and the
only item that touches most of the repo. That is the sum of the rows above at five days
to the week, and it exceeds the 7–10.5 weeks the first draft estimated for the _whole_ migration:
the early threads surfaced four generator divergences that the first pass had not priced, and
`#4` turned out to be an API change rather than a codemod.

Main risks, in order: credential signature stability (`#9d`), decoded-shape drift silently changing
behaviour across the sweep, and the five generator divergences below.

## Thread detail (ranked by risk × complexity)

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

## Findings

### `dxos.config` (#4) is not a codemod

`packages/sdk/config/src/index.ts` re-exports `@dxos/protocols/proto/dxos/config` wholesale — as
`defs` (the generated namespace, whose enums are numeric-valued objects) and as the public
`ConfigProto` type. Every `Runtime.Client.ServicesMode.DEDICATED_WORKER`-style reference in the
apps therefore reads through that re-export. buf renders those enums differently, so switching
`@dxos/config` to buf changes its public surface rather than just its imports. #4 needs a decision
on that surface first and is re-rated high complexity; it is not the cheap codemod pilot the first
draft of this audit assumed.

### What landed in #5, and why the rest cannot

Top-level enums are byte- and value-identical between the two generators, so devtools' enum
imports move now: `SignalState`, `ConnectionState`, `SpaceState` (two sites),
`EdgeReplicationSetting` and `LogLevel` are on `@dxos/protocols/buf/*` and the package type-checks
with no casts. What remains in devtools needs `#7` first:

- **Message type imports** (`Credential`, `KeyRecord`, `SubscribeToFeedBlocksResponse`, …) —
  the values are protobuf.js-shaped at runtime.
- **Nested enums** — `EdgePanel`'s `EdgeStatus.ConnectionState`, per the divergence above.
- **`JsonView`** — calls `schema.getCodecForType(value.type_url)` to decode arbitrary `Any`
  payloads at runtime, so it needs the buf type registry that `#9d` also waits on.

#### The blocker

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
3. **Oneof groups are shaped differently.** buf carries the selected member as
   `{ case, value }` under the group name; protobuf.js writes it as a plain field. The compat layer
   translates both directions, which is why `dxos.mesh.muxer.Command` round-trips flat.
4. **Nested enums are renamed.** protobuf.js nests them under the message namespace
   (`EdgeStatus.ConnectionState`); buf flattens to `EdgeStatus_ConnectionState`. TypeScript rejects
   the mixed case outright (`no overlap`), so these are safe to attempt but cannot land before
   `#7` — the enum belongs to a value whose type still comes from the protobuf.js barrel.
5. **`google.protobuf.Any`** is unsupported and throws.

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
`#1` and `#6` (done), `#4`, `#5`, `#7`, `#8` and all of `#9a`–`#9d`. `#2` is not a prerequisite —
deleting the two packages removes their own test and example protos with them, so those paths need
migrating only if the fixtures are worth keeping. `#4`, `#5` and `#7` are easy to
overlook here because they read protobuf.js through generated types and `protoMessage()` rather
than through `codec-protobuf` directly, but they are consumers all the same.
