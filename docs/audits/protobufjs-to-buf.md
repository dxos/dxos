# Plan: migrating off protobuf.js to buf

Where the migration stands and what is left. Counts are measured, not estimated; every "blocked"
claim below is established in code rather than assumed. The findings that shaped the plan are kept
at the bottom — read those before picking up a thread.

## Status

| #   | Thread                                  | State    | Notes                                                                    |
| --- | --------------------------------------- | -------- | ------------------------------------------------------------------------ |
| 1   | `@dxos/effect-proto` removal            | **done** | Package deleted; storybook rewritten on a hand-authored Effect Schema.   |
| 2   | Test/example protos                     | todo     | Untouched — `#3`'s harness was built against real dxos messages instead. |
| 3   | Shape-compat layer                      | **done** | `@dxos/protocols/buf-shape-compat` + conformance harness (5 tests).      |
| 4   | `dxos.config`                           | **done** | Converted natively; `@dxos/config` inputs are `ConfigInit`, values buf.  |
| 5   | devtools                                | **part** | Enum imports moved; the rest needs `#7` first.                           |
| 6   | `Stream` extraction                     | **done** | Moved to `@dxos/async`; generator emits it from there.                   |
| 7   | `protoMessage()` / `serviceError` → buf | **part** | 31 of 45 types route through buf; 14 `Any` carriers wait on `#3`.        |
| 8   | Remaining `ServiceDescriptor` RPC       | todo     | 21 production sites / 10 services, all cross-peer; 49 more are tests.    |
| 9a  | keyring `KeyRecord`                     | **done** | No substituted fields; wire format unchanged, asserted byte-for-byte.    |
| 9b  | `echo.query.Heads`                      | **done** | Same; also dropped the workerd lazy-codec workaround.                    |
| 9c  | `echo/metadata` + `echo/feed`           | **part** | `EchoMetadata` fixture landed; the other two types are `Any`-blocked.    |
| 9d  | credentials signing/verification        | todo     | Highest risk; additionally needs `Any` support in the compat layer.      |

**Next up, in order:** `Any` support in `#3` -- it gates `#7`'s last 14 types, two of `#9c`'s three,
and all of `#9d` -- then `#9c`'s store swap, `#8`, `#9d`, with the import sweep (which is what `#5`'s
remainder needs) alongside. `#2` is independent and can slot in anywhere.

Deleting `protobuf-compiler`/`codec-protobuf` and dropping `protobufjs` from the catalog is the
last step, and needs every thread above done.

## `#7` as landed: one file, no consumer changes

`protoMessage(typeName)` now resolves the type in a buf `Registry` built over the generated file
descriptors (`src/buf/registry.ts`) and encodes through the shape-compat layer (`#3`), which
reproduces the protobuf.js field shapes -- `PublicKey`, `Timeframe`, plain-object `Struct`, `Date`.
Callers are untouched and cannot observe which codec carried a type, which is what makes this one
file rather than a sweep.

Routing is decided per type when `protoMessage()` is called, by walking the descriptor for a
transitive `google.protobuf.Any` field: shape-compat cannot represent one, so those types stay on
the protobuf.js codec. A construction-time decision rather than a runtime throw on the first
payload. Measured on `22bea85f`: **31 of 45 types route through buf, 14 stay legacy.** The count is
of types `protoMessage()` still resolves; `SignedMessage` is not among them, having moved to an
explicit `bufMessage()` in this same change.

The 14 are the `Any` carriers: `Space`, `QuerySpacesResponse`, `JoinSpaceResponse`,
`CreateEpochResponse`, `Credential`, `Presentation`, `GossipMessage`, `QueryResponse`,
`edge.signal.Message`, `SignalResponse`, `SubscribeToFeedBlocksResponse`,
`Get`/`SaveSpaceSnapshotResponse`, and top-level `google.protobuf.Any` itself. Clearing them is
`Any` support in `#3`, which `#9d` needs anyway -- do it once, there.

An earlier revision of this section claimed `#7` _was_ the import sweep, on the reasoning that a
type still on `protoMessage` is one consumed outside the RPC boundary
(`plans/worker-package/service-rpc-schemas.md`), so flipping it rewrites its consumers. That is true
of moving a type to `bufMessage`, and it is why the sweep is separately expensive -- but `#7` never
required it. Re-pointing the implementation keeps the shapes.

### Struct was double-encoded

Fixing `#7` surfaced a live bug in `#3`: `protoc-gen-es` types a `google.protobuf.Struct` field as
`JsonObject` -- already a plain object -- so shape-compat's substitution re-encoded it into a Struct
keyed `fields`. 105 bytes against the legacy 43, and valid legacy bytes decoding to `{}`. It reached
every service call, because `dxos.error.Error` carries the only Struct on the RPC error channel and
`serviceError` rides all of them. No shape-compat test covered a Struct field. Now a passthrough,
with a regression test over nested objects and arrays.

Two lessons for the threads still open. Byte equality against the legacy codec is not optional even
for a type that looks unsubstituted, and it is worth checking what `protoc-gen-es` already maps a
well-known type to before writing a substitution for it. And prefer a JSON-string field over
`google.protobuf.Struct` in new protos: the substituted plain-object shape is what makes `Struct`
diverge between the generators, and it is what consumers reach through
(`signalEvent.payload.payload.data?.type` in the WebRTC proxy only parses because of it).

## `Any` support in `#3` is the one gate left

Measured while landing `#7` and `#9c`, and it reshapes the order of everything remaining:
`google.protobuf.Any` blocks `#7`'s last 14 types, two of `#9c`'s three, and all of `#9d`. Every
`Any` reached is the same field -- `Credential.subject.assertion`:

| Thread | Blocked on `Any` at                                                                |
| ------ | ---------------------------------------------------------------------------------- |
| `#7`   | 14 of 45 types, via `Credential` / `Presentation`                                  |
| `#9c`  | `LargeSpaceMetadata.controlPipelineSnapshot.messages.credential.subject.assertion` |
| `#9c`  | `FeedMessage.payload.credential.credential.subject.assertion`                      |
| `#9d`  | the credential itself                                                              |

So `Any` support is not `#9d`'s tail-end problem, it is the prerequisite for three threads. Do it
once in `#3` -- it needs a buf-side type registry (`buf/registry.ts` now provides one) and the
`preserve_any` field option -- rather than per thread.

## `#9c`: byte identity is not achievable, and that is the finding

`EchoMetadata` is the one `#9c` type not `Any`-blocked, and its fixture is in
`shape-compat.test.ts`. It does **not** encode byte-identically, for two reasons that apply to any
message with an unset non-optional message field:

- protobuf.js materialises the unset `updated` field as an empty `Timestamp`; buf omits it.
- protobuf.js writes `nanos: 0` explicitly; buf omits the proto3 default.

18 bytes against 10 on a minimal record. They stay wire-compatible, which is what a persisted
profile actually needs, so the fixture asserts that each codec reads the other's output rather than
that the bytes match. This qualifies the habit stated above: assert byte equality for anything
_signed_, but for merely _persisted_ data assert cross-codec round-trips, because byte equality is
unachievable wherever protobuf.js materialises an empty submessage.

The metadata store's codec is deliberately **not** switched yet. Decoding is asymmetric: bytes buf
wrote read back through the legacy codec as `updated: { seconds, nanos }` rather than a `Date`,
because the legacy substitution does not fire on a field buf omitted. That is a downgrade hazard for
existing profiles -- a client rolled back after writing buf-encoded metadata sees a raw object where
it expects a `Date` -- and wants either an `updated` default on write or a legacy-side fix first.

## `#5`: what is left needs sweep slices, not devtools edits

`JsonView` no longer resolves `google.protobuf.Any` through the protobuf.js schema; it uses the buf
registry and the compat layer, so a substituted field still renders in the shape the viewer formats.
That is the last piece of `#5` that stands alone.

The remaining 17 legacy imports in `devtools/src` are consumers of types `protoMessage` still hands
out in protobuf.js shape, so switching an import to buf makes the annotation disagree with the
runtime value. Each needs its type moved to `bufMessage` first, and the two that would unblock
`EdgePanel` are not small: `QueryEdgeStatusResponse` embeds `EdgeStatus`, which reaches **22 source
files** across edge-client, echo-host, client-services and plugin-space's sync UI. `EdgePanel`'s
nested-enum access (`WsStatus.ConnectionState.CONNECTED`, which buf emits as
`EdgeStatus_ConnectionState`) is a one-line fix gated behind that slice.

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
| 7      | Done for the 31 non-`Any` types; the remaining 14 ride `Any` support in `#3`                         | done        |
| 5      | `JsonView` done; the 17 remaining imports need their types swept (see `#5` above)                    | in sweep    |
| 9c     | `EchoMetadata` fixture done; store swap needs the downgrade fix, other two types need `Any`          | 3–5 days    |
| 8      | `ServiceDescriptor`/`createProtoRpcPeer` for mesh/teleport, iframe, bridge, agentmanager             | 1.5–2 weeks |
| 9d     | Credentials signing/verification, incl. `Any` support in the compat layer                            | 1–1.5 weeks |
| 2      | Test/example protos                                                                                  | 2–3 days    |
| —      | Import sweep: moving the 46 types' 505 consumer references to buf shapes (independent of `#7`)       | 3–4 weeks   |
| —      | Delete `protobuf-compiler`, `codec-protobuf`, `substitutions.ts`; drop `protobufjs` from the catalog | 3–5 days    |

**Remaining: roughly 8–12 engineer-weeks**, of which the import sweep is the long tail and the only
item that touches most of the repo. That is the sum of the rows above at five days to the week. It
has grown rather than shrunk as threads landed, for one reason each time: the first draft priced the
mechanical-looking parts as mechanical, and the generator divergences keep turning a type flip into
a rewrite at that type's consumers. `#7` folding into the sweep is the latest instance.

Main risks, in order: credential signature stability (`#9d`), decoded-shape drift silently changing
behaviour across the sweep, and the five generator divergences below.

## Thread detail (ranked by risk × complexity)

Independently landable threads, lowest → highest risk×complexity. Six have a dependency, in three
groups: `#7` and `#9a`–`#9d` on the shape-compat layer (`#3`), and `#8` on the `Stream` extraction
(`#6`). Within `#9`, each slice is ordered by blast radius: 9a → 9b → 9c → 9d.

| #   | Thread                                  | Scope                                                                                                             | Risk        | Complexity | Notes                                                                                                                                                                                                                                                                                                                                              |
| --- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ----------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `@dxos/effect-proto` removal            | 2 files                                                                                                           | very low    | very low   | The only real consumer is `react-ui-form`'s `ObjectTree.stories.tsx` (`parseProto`) — a storybook. Deletes an entire protobuf.js dependent.                                                                                                                                                                                                        |
| 2   | Test/example protos                     | `tools/protobuf-test`, `codec-protobuf/test`, `protobuf-compiler/test`, `example/testing/*`                       | very low    | low        | No persisted data, no signatures. Doubles as the conformance harness for #3.                                                                                                                                                                                                                                                                       |
| 3   | Shape-compat layer                      | new module in `@dxos/protocols`                                                                                   | low         | high       | Buf encode/decode reproducing the substituted shapes (PublicKey, PrivateKey, TimeframeVector, Any, Struct, Timestamp) plus byte/JSON-equality tests against protobuf.js. Nothing switches over, so risk stays low; gates #7 and #9.                                                                                                                |
| 4   | `dxos.config`                           | 55 files                                                                                                          | low         | medium     | Read-mostly, not persisted, not signed — but a public API change, since `@dxos/config` re-exported the generated namespace. Landed natively; see findings.                                                                                                                                                                                         |
| 5   | devtools                                | 20 files                                                                                                          | low         | low–medium | Diagnostic-only; regressions are visible and harmless. Already on effect-rpc (verified — see below), so this is a type-import sweep that rides on #7, not an RPC-seam exercise.                                                                                                                                                                    |
| 6   | `Stream` extraction                     | 26 import sites                                                                                                   | low         | medium     | Move `Stream` out of `codec-protobuf` into its own package; unblocks deleting that package.                                                                                                                                                                                                                                                        |
| 7   | `protoMessage()` / `serviceError` → buf | One file: registry + shape-compat routing behind the existing API                                                 | medium      | low        | The chokepoint, as first rated: shapes are preserved so no call site changes. Blocked only on `Any` for 14 of 45 types. Surfaced the Struct double-encoding bug in `#3` — see above.                                                                                                                                                               |
| 8   | Remaining `ServiceDescriptor` RPC       | 21 production `schema.getService()` sites / 10 services; 49 further sites are tests on `example.testing.*` protos | medium–high | high       | Cross-peer wire compatibility: a mismatch breaks replication between versions, not just a local call. Sequence after #6. `ServiceDescriptor` itself is only 8 references, all plumbing — the surface to migrate is `getService()` + `createProtoRpcPeer` (21 files). The test two-thirds carry no wire risk and can go first to prove the pattern. |
| 9a  | keyring `KeyRecord`                     | `halo/keyring/src/{keyring,sqlite-keyring}.ts`                                                                    | medium      | low        | One message, two codec sites, local SQLite only. Smallest persisted slice — do it first to validate #3 against real on-disk rows.                                                                                                                                                                                                                  |
| 9b  | `echo.query.Heads`                      | `echo-host/src/automerge/sqlite-heads-store.ts`                                                                   | medium      | low        | One message, one codec site. Rebuildable from Automerge if a migration goes wrong, which caps the downside.                                                                                                                                                                                                                                        |
| 9c  | `echo/metadata` + `echo/feed`           | 3 codec sites (`metadata-store`, `sqlite-metadata-store`, `pipeline/codec`); 46 files touch the types             | medium–high | medium     | Broad on-disk state with no cheap rebuild path. `LargeSpaceMetadata` and `FeedMessage` are `Any`-blocked; `EchoMetadata` is safe but cannot be byte-identical — see below.                                                                                                                                                                         |
| 9d  | credentials signing/verification        | `halo/credentials/src/credentials/*`, 94 declarations                                                             | highest     | high       | `signing.ts` stringifies the _substituted object_, so any shape drift invalidates every existing credential. Do last, behind 9a–9c, with fixtures of real signed credentials from released versions.                                                                                                                                               |

## Findings

### `dxos.config` (#4) was an API change, and it landed

`@dxos/config` re-exported the generated protobuf.js namespace wholesale, as `defs` and as the
public `ConfigProto` type, so every `Runtime.Client.ServicesMode.DEDICATED_WORKER`-style reference
in the apps read through it. buf renders nested types flat (`Runtime_Client_ServicesMode`), which
made this an API change rather than an import rewrite.

A compat shim that reproduced the protobuf.js shapes was tried first and abandoned: preserving the
nested names needed a recursive mapped type that had to special-case `$typeName`/`$unknown`,
`Struct`, `Any`, repeated-field optionality, and — fatally — enum identity, since TypeScript enums
are nominal and buf's are unassignable to protobuf.js' despite identical numbering. The only way
through was widening enum fields to `number`, losing type safety across the whole config surface.

Converting natively instead cost 55 files and no type-safety loss:

- Call sites use buf's flat names; `defs` re-exports the generated buf module.
- `ConfigInit` (`MessageInitShape<typeof ConfigSchema>`) is the input type for loaders, savers and
  the `Config` constructor; `Config.values` is a real buf message, normalised by `create()`.
- `ConfigKey` derivation needs its own projection (`ConfigFields`) to drop `$typeName`/`$unknown`,
  treat repeated fields as leaves, and stop at `Struct` — recursing into buf's `JsonValue` makes
  TypeScript bail and silently collapse the key union to `""`.
- `SystemService.getConfig` moved to a new native `bufMessage()` codec, same wire format.
- `runtime.app.env` is a `Struct`, so its values type as `JsonValue`, not `any`. Fourteen sites
  that wanted a string now go through `getEnvString(config, key)`.

Two behaviour changes fell out. `validateConfig` no longer type-checks at runtime: `ConfigInit`
covers compile-time callers, and the one-pass `fromJson` alternative cannot work because config
inputs legitimately carry packed `Any` messages, which `JSON.stringify` mangles. Validation of
untrusted YAML belongs in the loaders. And `toJson` on a config carrying `Module.record` now needs
a type registry (`createRegistry(StructSchema)`), where the protobuf.js substitution resolved the
payload implicitly.

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
