# Plan: migrating off protobuf.js to buf

Where the migration stands and what is left. Counts are measured, not estimated; every "blocked"
claim below is established in code rather than assumed. The findings that shaped the plan are kept
at the bottom — read those before picking up a thread.

## Status

| #   | Thread                                  | State    | Notes                                                                    |
| --- | --------------------------------------- | -------- | ------------------------------------------------------------------------ |
| 1   | `@dxos/effect-proto` removal            | **done** | Package deleted; storybook rewritten on a hand-authored Effect Schema.   |
| 2   | Test/example protos                     | todo     | Untouched — `#3`'s harness was built against real dxos messages instead. |
| 3   | Shape-compat layer                      | **done** | `@dxos/protocols/buf-shape-compat` + conformance harness (15 tests).     |
| 4   | `dxos.config`                           | **done** | Converted natively; `@dxos/config` inputs are `ConfigInit`, values buf.  |
| 5   | devtools                                | **part** | Enums (incl. the `cli-util`/`plugin-debug` stragglers) done; 15 blocked. |
| 6   | `Stream` extraction                     | **done** | Moved to `@dxos/async`; generator emits it from there.                   |
| 7   | `protoMessage()` / `serviceError` → buf | **done** | All 45 types route through buf, once `#3` learned to resolve `Any`.      |
| 8   | Remaining `ServiceDescriptor` RPC       | todo     | 21 production sites / 11 services, all cross-peer; 36 more are tests.    |
| 9a  | keyring `KeyRecord`                     | **done** | No substituted fields; wire format unchanged, asserted byte-for-byte.    |
| 9b  | `echo.query.Heads`                      | **done** | Same; also dropped the workerd lazy-codec workaround.                    |
| 9c  | `echo/metadata` + `echo/feed`           | **part** | Both metadata stores swapped; `pipeline/codec` held back for `#9d`.      |
| 9d  | credentials signing/verification        | **part** | Signature stability proven by test; the type sweep is what is left.      |

**Next up, in order:** `#8` (the last `ServiceDescriptor` RPC and the only remaining
milestone-sized thread), then `pipeline/codec` as the tail of `#9c`/`#9d`, then `#9d`'s type sweep.
`#5`'s remainder is **not** an independent sweep and must follow `#9c`/`#9d` -- see the correction
under `#5` below. `#2` is independent and can slot in anywhere. `Any` support is done, so nothing
is gated any more -- what is left is volume, not blockers.

Deleting `protobuf-compiler`/`codec-protobuf` and dropping `protobufjs` from the catalog is the
last step, and needs every thread above done.

## `#7` as landed: one file, no consumer changes

`protoMessage(typeName)` now resolves the type in a buf `Registry` built over the generated file
descriptors (`src/buf/registry.ts`) and encodes through the shape-compat layer (`#3`), which
reproduces the protobuf.js field shapes -- `PublicKey`, `Timeframe`, plain-object `Struct`, `Date`.
Callers are untouched and cannot observe which codec carried a type, which is what makes this one
file rather than a sweep.

Every type `protoMessage()` resolves now routes through buf. The construction-time gate that kept
`google.protobuf.Any` carriers on the protobuf.js codec is gone, because `#3` resolves `Any`.

Routing the last 14 types fixed a live bug rather than merely moving them. `dxos.echo.query.QueryResponse`
was one of them, and `@protobufjs/utf8.read` corrupts a >8KB payload containing an astral character on
the JS Reader path -- a plain `Uint8Array`, which is what arrives over the browser worker MessagePort,
rather than Node's native `BufferReader`. That is why the query wire was rewritten as an inline Effect
schema in the first place. `QueryService.test.ts` used to assert the corruption; it now asserts the
round-trip, so the guard points the other way.

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

## `Any` support in `#3`, and what it retired

`google.protobuf.Any` had blocked `#7`'s last 14 types, two of `#9c`'s three and all of `#9d`, always
at the same field -- `Credential.subject.assertion`. It is now resolved in the compat layer, keyed off
`buf/registry.ts`:

- A resolvable `type_url` is unpacked recursively through the compat layer, so the payload's own
  substituted fields come back substituted, and tagged with `@type` as the legacy codec does.
- An unresolvable `type_url` stays packed as `{ '@type': 'google.protobuf.Any', type_url, value }`,
  again matching the legacy codec rather than failing.
- A field carrying `[(preserve_any) = true]` keeps its payload packed. The option is read from the
  generated `preserve_any` extension, so the field decides -- there is no caller-supplied encoding
  option, because `protoMessage()` never passed one.
- `google.protobuf.Struct` as an `Any` payload goes through buf's JSON form, since `protoc-gen-es`
  aliases a Struct _field_ to `JsonObject` but a standalone Struct message is still a message.

### Credential signatures are safer than the plan assumed

The stated top risk was that any decoded-shape drift invalidates every credential, because
`signing.ts` stringifies the substituted object. Reading `canonicalStringify` closes most of that:
`json-stable-stringify` **sorts keys**, and the replacer normalises `PublicKey`, `Buffer` and
`Uint8Array` all to the same hex string. So two divergences that do exist between the codecs are
provably harmless to signatures:

- **Key order.** The compat layer emits buf's field order, not protobuf.js'.
- **`bytes` views.** protobuf.js decodes a `bytes` field to a `Buffer`; buf to a `Uint8Array`.

`getCredentialProofPayload` also already strips an empty `parentCredentialIds` and the assertion's
proto3 defaults, which covers the third divergence (buf materialises an unset repeated field as `[]`,
protobuf.js omits the key). An earlier attempt here deleted empty collections in the compat layer to
"fix" this; that was backwards -- protobuf.js materialises them too, and the change made the layer
diverge. Do not repeat it.

What is asserted, in `credentials/buf-compat.test.ts`: a credential signed on protobuf.js verifies
after a buf round-trip and in the reverse direction, and both codecs produce byte-identical
`getCredentialProofPayload` output. `#9d`'s remaining work is therefore the type sweep at the 94
declaration sites, not the signature question.

## The `preserveAny` caller option, and what it unblocked

`anySubstitutions` preserves an `Any` when **either** the field carries `[(preserve_any) = true]` **or**
the caller passes `{ preserveAny: true }`. The first revision of `#3` implemented only the field half,
which silently excluded the two production sites relying on the caller half -- neither `dxos/rpc.proto`
nor `dxos/mesh/messaging.proto` marks its `Any` fields, so the option is the only thing keeping those
payloads packed:

| Site                              | Message                               | Why it stays packed                                                                        |
| --------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------ |
| `mesh/rpc/src/rpc.ts`             | `dxos.rpc.RpcMessage`                 | Frames every RPC between peers; the payload is the callee's business, not the transport's. |
| `mesh/messaging/src/messenger.ts` | `dxos.mesh.messaging.ReliablePayload` | Rides the signalling network; the peer resolves it, not the relay.                         |

`encodeCompat` / `decodeCompat` / `compatCodec` now take a `CompatOptions` argument and both sites are
on the compat codec. These are the highest-traffic wire formats in the repo -- a byte mismatch breaks
all peer communication rather than one call -- so both carry fixtures against the legacy codec, plus a
negative test proving the option actually gates (without it, a registered payload resolves).

`ReliablePayload` asserts byte equality. `RpcMessage` deliberately does not, and cannot:
protobuf.js writes its non-optional `stream: false` explicitly (`20 00`) where buf omits the proto3
default, so the two differ by two bytes. Its fixture asserts cross-codec round-trips and the packed
`Buffer` shape instead -- the rule this plan already states for data that is neither signed nor
persisted.

Two notes for `#8`. `createProtoRpcPeer` threads `encodingOptions` down to the codec, so this argument
is the prerequisite that path needed. And `rpc.ts` keeps its lazy-codec comment ("breaks in workerd");
`#9b` retired the same workaround once its type moved to buf, so re-test whether this one still earns
its keep.

## `#9c`: the stores are on buf; the feed codec is not

All three `#9c` types now have byte-equality fixtures, including the two `Any` had blocked:
`LargeSpaceMetadata`'s control-pipeline snapshot of credentials, and `FeedMessage`'s credential
payload (which also exercises a `oneof` wrapping a packed `Any`).

`metadata-store.ts` and `sqlite-metadata-store.ts` encode through `compatCodec(EchoMetadataSchema)` /
`compatCodec(LargeSpaceMetadataSchema)`. The downgrade hazard an earlier revision recorded here does
not arise: it assumed an unset `updated`, and both stores' `_save` sets `created` and `updated`
unconditionally, so buf's omission of proto3 defaults never reaches a rolled-back reader as a missing
field. `compatCodec` exists so a store can swap codecs without touching its own file/CRC plumbing --
both stores took only their two codec constants and one type annotation.

`EchoMetadata` still cannot be byte-identical, for the reason recorded before: protobuf.js
materialises an unset non-optional message field as an empty submessage and writes `nanos: 0`
explicitly, where buf omits both (18 bytes against 10 on a minimal record). Its fixture asserts
cross-codec round-trips rather than byte equality. That qualification stands for merely _persisted_
data; assert byte equality for anything _signed_.

Re-scope both of these against `DX_AUTOMERGE_CREDENTIALS` (landed separately): moving credentials into
an automerge document changes how much of `#9d` is a feed problem at all, so plan against the flag's
end state rather than the feed one.

`pipeline/codec.ts` -- the `FeedMessage` codec -- is deliberately **not** swapped. Its fixture now
passes byte-identically, so nothing technical blocks it, but it is the value encoding for
hypercore-signed feed blocks replicated between peers, and `createCodecEncoding` is typed on
`codec-protobuf`'s `Codec` (it passes an options argument the compat codec has no use for). Swapping
the signed replication path wants cross-version fixtures of real feeds, which is `#9d`'s job, not a
rider on a metadata change.

## `#5`: most of the remainder was a stale annotation, not a sweep

An earlier revision priced all 17 remaining devtools imports as needing their type moved to
`bufMessage` first. That over-counted, and the correction is the useful finding: **only six of
`DevtoolsHost`'s RPC responses are `protoMessage`-carried** (`SubscribeToSpaces`,
`SubscribeToFeedBlocks`, `SubscribeToMetadata`, `GetSpaceSnapshot`, `SaveSpaceSnapshot`, `Signal`).
Everything else on that service is a hand-authored Effect struct. So a devtools file annotating one
of those values with a `@dxos/protocols/proto/*` type is not blocked on anything -- the annotation is
simply pointing at the wrong type, and the fix is to point it at the Effect type the service actually
declares.

Two moved that way -- `KeyRecord` and `ConnectionInfo`, both to `DevtoolsHost.*` -- and
`devtools:build` is the proof, per the attempt-and-let-`tsc`-rule habit below.

### Correction: `#5` does not ride on `#7`, and `NetworkPanel` was described backwards

Two claims in the paragraph above were wrong, and both were measured against main `32584c984a` by
applying all 15 remaining conversions at once and reading `dx-build`'s 64 errors.

**`NetworkPanel`'s `PeerState` is `dxos.mesh.presence.PeerState`.** The earlier note had it as
`SpaceSyncState.PeerState` from `DataService`; it is not. `NetworkPanel.tsx:7` imports
`type PeerState` from `@dxos/protocols/proto/dxos/mesh/presence` and uses it at line 18. That
message _is_ generated as a bufMessage (`PeerStateSchema` in `buf/dxos/mesh/presence_pb`), so
codegen is not the blocker. The blocker is the **producer**: `teleport-extension-gossip`'s
`Presence` still emits the protobuf.js-substituted shape, so `peerId` is a `@dxos/keys` `PublicKey`
(hence `.truncate()` at line 98) rather than buf's `PublicKey` _message_. Nothing in the repo
currently assigns `NetworkGraphNode.peer`, so converting it would type-check after adapting
`.truncate()` -- and would be describing a shape no producer emits. It is gated on `#8.4`
(teleport extensions), not on a missing bufMessage.

**`#7` unblocked nothing here.** `protoMessage` is still typed
`Schema.Codec<TYPES[K], Uint8Array>` over the protobuf.js `src/proto/gen` barrel; `#7` routed the
_bytes_ through buf via the compat layer while deliberately preserving the protobuf.js type and
substituted runtime shape. That is the whole point of the shape-compat layer -- call sites do not
change when a codec is swapped -- so there is nothing for a devtools type sweep to ride on. Only
`bufMessage` exposes a buf type, and just one `DevtoolsHost` field uses it today
(`SignedMessageSchema`).

All 15 remaining declarations are therefore blocked, in four mechanically distinct ways:

- **Missing `$typeName`.** Every buf type is `Message<"name"> & {...}`, so a protobuf.js-shaped
  value is never assignable to it. This is what breaks `useCredentials`, `useStats`' probe and
  `LoggingPanel`.
- **Substituted fields.** `Credential.id` is `@dxos/keys` `PublicKey` on protobuf.js and a
  `PublicKey` _message_ on buf; likewise `Date` vs `Timestamp` (`.getTime()`), `Timeframe` vs
  `TimeframeVector` (`.get()`), and `Any` vs a `['@type']`-indexable bag.
- **`oneof` modelling.** buf emits a discriminated union, so `SignalResponse.swarmEvent` and
  `.message` simply do not exist -- 17 of the 64 errors are this one difference in
  `SignalMessageTable`.
- **Optionality.** buf marks singular message fields optional (`metadata?`), protobuf.js does not.

Two files -- `useStats.ts` and `EdgePanel.tsx` -- _compile_ after conversion, but only because
`Object.assign({}, stats, { edge })` erases the mismatch. A direct probe
(`const x: BufResp = protoShapedValue`) fails with the missing-`$typeName` error, so converting
them would annotate buf types over protobuf.js values: a silent lie rather than a migration. They
are counted as blocked.

Each carrier would have to move `protoMessage` -> `bufMessage`, and tracing what that pulls in
shows `#5`'s remainder is downstream of `#9c`/`#9d`, not of `#7`:
`SubscribeToMetadataResponse` embeds `EchoMetadata` (the metadata store is on `compatCodec`, so its
exposed type is still protobuf.js), `SubscribeToFeedBlocksResponse.Block` embeds `FeedMessage`
(`pipeline/codec`, explicitly held back), and `SubscribeToSpacesResponse.SpaceInfo` embeds
`Space.PipelineState` -> `TimeframeVector` + `Credential`. `QueryEdgeStatusResponse` embeds
`EdgeStatus`, which reaches **22 source files** across edge-client, echo-host, client-services and
plugin-space's sync UI. `EdgePanel`'s nested-enum access
(`WsStatus.ConnectionState.CONNECTED`) is a one-line fix gated behind that slice.

### Enums move iff the name survives

`tsc` relates enum types by **name**, not by declaration — verified with a local probe: a bare
`enum SameName` and a `namespace Outer { export enum SameName }` compare without complaint, while
an identically-valued `enum DifferentName` raises `TS2367`. So:

- **Top-level enums** keep their name under buf and convert with no call-site change. The last two
  stragglers moved on that basis: `EdgeReplicationSetting` in `cli-util/src/util/space.ts` and
  `ConnectionState` in `plugin-debug`'s `DebugStatus.tsx`, both value-identical
  (`0`/`1`) and green under `cli-util:build` / `plugin-debug:build`.
- **Nested enums** are flattened by buf (`EdgeStatus.ConnectionState` -> `EdgeStatus_ConnectionState`),
  the name changes, and every `===` against the protobuf.js-typed field breaks. That is why
  `EdgePanel` cannot be fixed ahead of its type move, and it generalises to any nested enum
  elsewhere in the migration.

## The cross-codec guard: what it proves, and the two divergences it found

Built against the current tree rather than a released build, because both codecs are in the
workspace right now. It walks the buf registry programmatically -- 258 messages, 517 generated
cases -- synthesises a fully populated value per message, and asserts that the two decoders agree on
the same bytes and the two encoders agree on the same value.

**It is not a downgrade or compatibility guard, and must not be cited as one.** Both sides
regenerate from the same `src/proto` tree, so a wire-incompatible edit to a `.proto` moves them
together and passes here unnoticed -- which is precisely the failure a comparison against a
_released_ build would catch. What this does give is continuous agreement between the two codecs on
every CI run as declarations move, which the one-shot historical comparison never could. The two are
complements, not substitutes.

**It dies with protobuf.js.** The guard exists only while both codecs do; the teardown slice deletes
it along with `@dxos/codec-protobuf`. Noted here so it is not later found and puzzled over.

### Rejected: pinning a released version

`@dxos/protocols@0.11.1` (published 2026-08-05) is the last stable release preceding the first
buf-migration commit on main (`bdb02cd3a1`, 2026-08-24); the only thing published in between is a
`1.0.0-next-<sha>` CI snapshot, and the codec did not move until `48eb05d613` (2026-08-26), so both
readings of the cutoff select it. The derivation holds and is worth keeping.

What killed it is a finding in its own right: **the pin cannot be loaded in-process.**
`@dxos/protocols@0.11.1` pulls `@dxos/keys@0.11.1`, built against effect 3.x, which calls
`Schema.filter`; under the workspace's `effect@4.0.0-rc.108` that throws at import time, before any
test body runs. Aliasing it into the workspace also fails, because pnpm's `packages/**/*` glob links
the workspace copy over the pin. It _does_ load in an isolated closure -- verified, `effect@3.21.4`,
`dxos.echo.query.Heads` round-tripping to `0a04613162320a0463336434` -- which is the shape a real
downgrade guard would need: a spawned process with its own dependency graph, because that is what a
build in the field actually is.

### The clearest evidence in this migration that a green test run is not proof

The guard reported **518/518 passing while silently skipping every repeated field.** Its field walk
branched on `field.repeated`, which does not exist on buf's descriptors: buf models a repeated field
as its own `fieldKind: 'list'` carrying a `listKind` discriminant, so every `list` field fell
through the walk's `default` and was never populated.

vitest ran the file green. The type error sat in a branch no generated case ever reached, so nothing
executed it. Only `protocols:build` rejected it. Nothing about the test output distinguished a guard
walking 258 messages properly from one walking them with every repeated field missing -- the case
count was identical either way, because the cases are per message, not per field.

Correcting the walk raised the ledger from **19 entries to 42**, with **zero new error classes**:
the same single root cause reaching further, now through repeated members (`spaces`, `signatures`,
`invitations`, `parents`, `credentials`, `contacts`). Nothing new was wrong; more of what was
already wrong became visible.

Two things follow, and they are the reason this is recorded here rather than left in a commit
message. `moon build` belongs on every package a change touches, including the ones where the only
change is a test file. And a coverage claim should be checked against what the generator actually
emitted, not against the number of cases it produced -- 518 was true and meant less than it looked.

### What the ledger is, and is not

**42 recorded divergences.** Not a tolerance budget and not a list of things that are fine: a
ledger of one root cause -- protobuf.js's decoder materialising an _absent_ singular message field
with unsubstituted defaults, which its own encoder then rejects -- observed at 42 message/field
sites. Each entry is keyed on the message **and the exact field paths**, so a listed message that
starts diverging somewhere new goes red. A no-growth assertion pins the count, and a staleness check
fails a listed message that stops diverging, since a stale entry would silence a future regression
on a message that is currently clean. Entries are expected to disappear as messages move to buf.

Headline figures, in the order they should be read: the guard went **483/517 -> 518/518** once the
19 real divergences were separated from three generator artefacts, then **19 -> 42** once the
repeated-field miss was corrected. `encodeCompat`/`decodeCompat` handling all 258 messages is
recorded beside that, never instead of it -- the finding is that protobuf.js's decoder and its
encoder disagree, not that the compat path is clean.

### Divergence 1: protobuf.js cannot re-encode its own decode output

Its decoder materialises an _absent_ singular nested message with **unsubstituted** defaults, which
its own encoder then rejects. On `Chain.credential`:

```
chain = {"credential":{"issuer":{"data":{}},
                       "issuanceDate":{"seconds":"0","nanos":0},
                       "subject":{"id":{"data":{}},"assertion":{"type_url":"","value":{}}}}}
re-encode -> TypeError: value.getTime is not a function
```

`issuer` comes back as `{data:{}}` rather than a `PublicKey`, `issuanceDate` as `{seconds,nanos}`
rather than a `Date`. Seventeen messages are affected, all of them ones that can contain an absent
nested message. This is the legacy codec's own asymmetry and predates the migration; the compat
layer does not have it -- `encodeCompat`/`decodeCompat` handled all 258 messages. That is
reassuring, but it is not the headline: the headline is that protobuf.js's decoder and its encoder
disagree, and the guard records each affected message with the _specific_ field and error rather
than muting the message wholesale.

### Divergence 2: `Timestamp` -> `Date` loses sub-millisecond precision

The substitution target is a JS `Date`, which is millisecond-resolution, so a `nanos` value that is
not a multiple of 1,000,000 cannot survive a round-trip (`nanos: 102` returns as `0`). The guard
deliberately generates only millisecond-representable timestamps, so **it does not exercise this
case** -- otherwise every message carrying a timestamp would fail for this one reason and mask
everything else. Recorded here because the guard no longer says it.

**Checked against signed data, and it is not reachable.** Two independent reasons:

1. Every timestamp on a signed credential is set from `new Date()` --
   `credential-factory.ts:58` (`issuanceDate`), `credential-factory.ts:66` and
   `presentations/presentation.ts:29` (`creationDate`). A JS `Date` cannot hold sub-millisecond
   precision, so `nanos` is always a multiple of 1,000,000 by construction.
2. The signature is not computed over protobuf bytes at all. `getCredentialProofPayload` returns
   `canonicalStringify(copy)`, and the replacer has no `Date` branch, so a date reaches the payload
   through `JSON.stringify` -> `Date.prototype.toJSON()` -> an ISO-8601 string truncated to
   milliseconds. The `nanos` field never enters a signature even in principle, and a re-encode that
   changes `nanos` cannot change a signature.

So the byte difference is real but confined to the wire, where it is the ordinary proto3-default
omission and readable in both directions.

## `#2`: split by fate before converting, and most of it dies at teardown

`#2`'s nominal file list spans four places. Judged per file rather than per directory, almost none
of it is worth converting -- the packages that own it are what the teardown slice deletes.

**Dies at teardown -- leave on protobuf.js:**

| File                                                                          | Why                                                                                                                                                                                                                     |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `codec-protobuf/test/codec.node.test.ts` + its three `example/testing` protos | Exercises `@dxos/codec-protobuf` itself.                                                                                                                                                                                |
| `codec-protobuf/src/substitutions/struct.test.ts`                             | Tests the legacy substitution table.                                                                                                                                                                                    |
| `protobuf-compiler/test/*` (12 files)                                         | Tests the legacy generator's output.                                                                                                                                                                                    |
| `protobuf-compiler/src/namespaces.test.ts`                                    | Same.                                                                                                                                                                                                                   |
| **`tools/protobuf-test` (whole package)**                                     | Reads as a standalone fixture and is not: its own header says "Imported by protobuf-compiler tests", and `protobuf-compiler/test/types.test.ts:19` is its only reference in the repo. It goes with `protobuf-compiler`. |

**Gated on `#8.2`, not `#2`:** the `example/testing/rpc` importers -- `rpc/service.test.ts`,
`rpc/service-type-url.test.ts`, `teleport/testing/test-extension.ts`,
`teleport/testing/test-extension-with-streams.ts`, `teleport/muxing/muxer.test.ts`,
`websocket-rpc/e2e.node.test.ts`, `rpc-tunnel-e2e/test-client.ts`, `rpc-tunnel-e2e/test-worker.ts`.
These already take their _descriptor_ from `getBufService`, but still import the protobuf.js
**service interface** as the type argument. Deriving that interface from buf's `GenService` is
`#8.2`'s remaining work; the methods have to move to buf shapes at the same time, because
`BufServiceDescriptor` still hands back compat-shaped values.

**Nothing left to migrate.** `example/testing/{data,rpc}.proto` are already buf-generated
(`buf/proto/gen/example/testing/`), `buf/registry.ts` already consumes them, and there are no
message-only consumers to move. `#2`'s remaining value is the ledger above, not a conversion.

## Proto-guard: the downgrade leg needs its own dependency closure

The dated snapshot proves old bytes decode on new code. The reverse -- bytes this codec writes being
readable by a build already in the field -- is the direction that strands a rollback, and it is not
covered.

**Pin: `@dxos/protocols@0.11.1`, published 2026-08-05.** Derived as the last stable release
preceding the first buf-migration commit on main (`bdb02cd3a1`, "protocols: audit protobuf.js usage
and start the buf migration", 2026-08-24). The only thing published in between is a
`1.0.0-next-<sha>` CI snapshot on 2026-08-10, which is not a release. The codec itself did not move
until `48eb05d613` (2026-08-26), so either reading of "first buf-migration commit" selects the same
version. Write it as a literal, never resolve "latest before X" at runtime -- that drifts silently.

**It cannot be imported in-process.** `@dxos/protocols@0.11.1` pulls `@dxos/keys@0.11.1`, which is
built against `effect@3.x` and calls `Schema.filter`; against the workspace's `effect@4.0.0-rc.108`
that is `TypeError: Schema.filter is not a function`, thrown at import time before any test body
runs. Aliasing the package into the workspace does not work.

**It does work in an isolated closure**, which is what a downgrade test should use anyway -- a build
in the field has its own dependency graph. Verified: an `npm install @dxos/protocols@0.11.1` in a
scratch directory resolves `effect@3.21.4` and its codec round-trips
(`dxos.echo.query.Heads` -> `0a04613162320a0463336434`). The remaining work is the harness: install
the pinned version into a gitignored fixture directory and spawn it to decode bytes the current
codec wrote. Assert shape and round-trip, not byte identity -- protobuf.js writes `nanos: 0` where
buf omits the proto3 default, which is wire-compatible and expected.

## `#9c` `EchoMetadata` is blocked on a scope decision, not in progress

The metadata _codec_ has already moved -- both stores are on `compatCodec`, so the bytes are buf
today. What `#9c` moves is the **type the store exposes**, and that is where it stops.

**Containment breaks through `invitations`.** `EchoMetadata.invitations` is
`repeated dxos.client.services.Invitation` (`metadata.proto:35`) -- a **concrete message field, not
an `Any`**, so `preserveAny` does not apply and moving `EchoMetadata` makes the field a buf
`Invitation[]` by construction. Not a prediction; the build says so:

```
metadata-store.ts(231,36): error TS2345: Argument of type
  '.../buf/proto/gen/dxos/client/invitation_pb").Invitation' is not assignable to parameter of type
  '.../proto/gen/dxos/client/services").Invitation'
```

`dxos.client.services.Invitation` has **55 importers across 7 packages** (client-services 23,
client 8, client-protocol 7, client-e2e 6, halo 2, shell 1, observability 1) and is itself a
`protoMessage` carrier on `InvitationsService`. That is a milestone-sized slice.

**A per-field carve-out is not available.** `EchoMetadata` is one generated type; its `invitations`
field _is_ `Invitation[]` from the buf module. Leaving that one field on the protobuf.js type would
need a structural alias, and a half-migrated message is worse than an unmigrated one because it
looks finished. `SpaceMetadata` and `IdentityRecord` cannot be split off either -- both are children
of `EchoMetadata`, so the container's type determines theirs.

Note for scoping: the raw importer count for `@dxos/protocols/proto/dxos/echo/metadata` is 29, but
**21 of those import only `EdgeReplicationSetting`**, a top-level enum that moves independently and
already has. The message-type surface is 8 files in `packages/sdk/client-services` -- true of the
imports, and _not_ a description of what moving `EchoMetadata` costs, which is the containment
above.

### Where the proto does draw a line

`EchoMetadata` and `LargeSpaceMetadata` are **two independent persisted records with separate
codecs** in the store. `LargeSpaceMetadata` -> `ControlPipelineSnapshot` ->
`{PublicKey feed_key, Credential credential}` + `TimeframeVector` references **neither `Invitation`
nor anything else out of scope**, beyond the sanctioned two-site `Credential` boundary decode at
`control-pipeline.ts:148` and `:165`. Consumer surface: three files. That record can move on its own
whenever the scope decision lands.

### An `Invitation` move obliges a guard re-run

`invitations` appears in **four entries of the cross-codec ledger** (`['invitations']` twice,
`['metadata.invitations', 'metadata.spaces']`, and `['invitations', 'spaces']`). Changing
`Invitation`'s type reshapes those, so that slice carries a guard re-run with the 42 count and the
staleness check reconfirmed. Visible here so it is priced before anyone commits to it, rather than
discovered inside it.

## `#8` is the last milestone-sized thread, and it is not a rider

Everything above landed behind an interface that hides which codec carried a value, which is why it
could go in one change. `#8` cannot: `schema.getService()` and `createProtoRpcPeer` are the RPC
_transport_ for mesh/teleport, the iframe bridge and agentmanager, so migrating them changes what
goes on the wire between peers -- a mismatch breaks replication between released versions rather than
failing a local call. The test sites on `example.testing.*` protos should go first to prove the pattern
without wire risk.

Measured, the 16 non-test files fall into clusters, which is how to slice it: 4 teleport
extensions (control, gossip, replicator, automerge-replicator); 7 in
client-services/client-protocol (invitations x2, auth, admission-discovery, notarization,
`service.ts`, agent-hosting-provider); 3 in-repo `testing/` helpers (`network-manager`'s
`test-builder`, teleport's `test-extension` and `test-extension-with-streams`); one
`rpc-tunnel-e2e` demo (`test-worker.ts`); plus `gen-service-rpcs.ts`, the generator itself. Only
the first two clusters carry cross-peer wire risk.

### There is no drop-in buf RPC, but the descriptors are already here

`buf.gen.yaml` runs only `protoc-gen-es`, and `@connectrpc/*` is absent from the repo, so nothing
buf-native is wired up today. But `protoc-gen-es` emits a `DescService` for each of the 18 `service {}`
blocks, and `bufRegistry` is a `Registry`, which exposes `getService(typeName)` -- the buf-side
equivalent of `schema.getService()` already exists.

`DescService` carries everything `ServiceDescriptor` reads, and one thing differs on the wire.
Measured against `dxos.mesh.teleport.control.ControlService`: the service name matches once the
legacy `.slice(1)` strips its leading dot, `method.name` is identical (`RegisterExtension`), and
`method.localName` is already the camelCase handler key `mapRpcMethodName` computes by hand.
Stream kind needs care rather than a one-to-one swap: buf carries a single `methodKind`
(`unary`, `server_streaming`, `client_streaming`, `bidi_streaming`) where protobuf.js carries two
independent flags, and `service.ts` asserts `!method.requestStream`, so only the first two kinds
are reachable here -- `methodKind === 'unary'` stands in for `!responseStream` across the services
DXOS actually declares, not in general. But the request/response type names diverge:
protobuf.js reports `.dxos.mesh.teleport.control.RegisterExtensionRequest` with a leading dot and
buf reports it without, and that string goes into `Any.type_url` from both ends: the client `Service`
writes the request type on every call, and `ServiceHandler.call`/`callStream` write the response type
on every reply. Two conventions coexist and must not be conflated: `Codec.encode` writes
`fullName.slice(1)`, dot-free, and the messaging and swarm paths dispatch on exactly that
(`swarm-messenger` compares against `dxos.mesh.swarm.SwarmMessage`, `messenger` against
`dxos.mesh.messaging.{ReliablePayload,Acknowledgement}`) -- buf's `typeName` is dot-free too, so
those comparisons keep matching. The service path is the one that differs, and nothing in it reads
`type_url`, so dropping the dot there should be inert. "Should be" is not a wire contract, so `#8`
needs a fixture pairing a legacy client with a buf server and the reverse before anything switches.

Three directions, in preference order:

1. **Re-point `@dxos/rpc` at buf descriptors.** Reimplement `ServiceBundle`/`ServiceDescriptor` over
   `DescService` and encode payloads through the compat layer, keeping `RpcPeer`'s framing and the
   `dxos.rpc.RpcMessage` envelope byte-identical. The surface is `service.ts` (~190 lines) plus
   `rpc.ts`. Recommended -- but not risk-free: `ServiceHandler` writes the protobuf.js type name
   into `Any.type_url` and `DescService` supplies it without the leading dot, so this direction is
   gated on the bidirectional fixture described above (or on normalising the name explicitly).
2. **effect-rpc** (`effect/unstable/rpc`) -- where the repo is already heading, and right for anything
   whose wire may change or that is already an `RpcGroup`. A rewrite per service, so it carries the
   same cross-version caution as (3).
3. **Connect** (`@connectrpc/connect` + `protoc-gen-connect-es`) -- buf's official answer, and the
   wrong shape here. It is built on HTTP semantics (fetch `Request`/`Response`), unary plus
   server-streaming, bidi only over HTTP/2 gRPC. DXOS's transports are teleport-muxed channels,
   MessagePorts and WebSockets, none of them HTTP. Adopting it changes the peer wire, which is the one
   thing `#8` exists to avoid.

Before starting any thread, read **Findings** at the bottom: the five generator divergences are
what make the mechanical-looking parts non-mechanical, and two of them (`Any`, nested enums) are
hard gates rather than nuisances. Two habits earned their keep here and are worth repeating:
assert byte **and** shape equality against the protobuf.js codec for anything **signed**, and
cross-codec round-trips for data that is only **persisted** (byte identity is unachievable there --
see `#9c`); and when a switch looks safe, attempt it and let `tsc` rule rather than reasoning about
it — that is how both the nested-enum gate and the `Buffer`-view divergence surfaced.

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
| `.ts`/`.tsx` files importing `@dxos/protocols/proto/*` (protobuf.js gen) | 252 files / 372 declarations |
| Files importing `@dxos/protocols/buf/*` (already migrated)               | 25 (dxos) + 85 (edge)        |
| Files importing `@dxos/codec-protobuf`                                   | 22 (10 of them type-only)    |
| `schema.getCodecForType(...)` call sites                                 | 51 (2 production sites left) |
| `Stream` imports from `@dxos/codec-protobuf`                             | 26                           |

Counted over git-tracked `*.ts`/`*.tsx` only, matching `import`/`export … from '@dxos/protocols/proto/…'`
declarations (not raw mentions of the path). The `getCodecForType` figure rose while the import figure
fell, because the sites that remain are overwhelmingly fixtures asserting the legacy codec against the
compat layer -- the count is now a measure of test coverage rather than of exposure. How many of those declarations
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
| 7      | All 45 types route through buf                                                                       | done        |
| 5      | `JsonView` and two mis-annotated imports done; the 14 remaining need their types swept               | in sweep    |
| 9c     | Both metadata stores swapped; `pipeline/codec` rides `#9d`                                           | 1–2 days    |
| 8      | `ServiceDescriptor`/`createProtoRpcPeer` for mesh/teleport, iframe, bridge, agentmanager             | 1.5–2 weeks |
| 9d     | Credentials type sweep; the signature question is settled by test                                    | 1 week      |
| 2      | Test/example protos                                                                                  | 2–3 days    |
| —      | Import sweep: moving the 45 types' consumer references to buf shapes (independent of `#7`)           | 3–4 weeks   |
| —      | Delete `protobuf-compiler`, `codec-protobuf`, `substitutions.ts`; drop `protobufjs` from the catalog | 3–5 days    |

**Remaining: roughly 7–10 engineer-weeks**, of which the import sweep is the long tail and the only
item that touches most of the repo. That is the sum of the rows above at five days to the week. This
is the first revision where the estimate fell, and for a reason worth keeping: two of the three items
that shrank did so because a stated blocker turned out to be an assumption -- the credential signature
risk (`canonicalStringify` sorts keys and normalises byte views) and `#9c`'s downgrade hazard (both
stores always write both timestamps). Check the assumption before pricing the thread.

Main risks now, in order: `#8`'s cross-peer wire compatibility, decoded-shape drift silently changing
behaviour across the sweep, and the five generator divergences below.

## Thread detail (ranked by risk × complexity)

Independently landable threads, lowest → highest risk×complexity. Six have a dependency, in three
groups: `#7` and `#9a`–`#9d` on the shape-compat layer (`#3`), and `#8` on the `Stream` extraction
(`#6`). Within `#9`, each slice is ordered by blast radius: 9a → 9b → 9c → 9d.

| #   | Thread                                  | Scope                                                                                                             | Risk        | Complexity | Notes                                                                                                                                                                                                                                                                                                                                                   |
| --- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ----------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `@dxos/effect-proto` removal            | 2 files                                                                                                           | very low    | very low   | The only real consumer is `react-ui-form`'s `ObjectTree.stories.tsx` (`parseProto`) — a storybook. Deletes an entire protobuf.js dependent.                                                                                                                                                                                                             |
| 2   | Test/example protos                     | `tools/protobuf-test`, `codec-protobuf/test`, `protobuf-compiler/test`, `example/testing/*`                       | very low    | low        | No persisted data, no signatures. Doubles as the conformance harness for #3.                                                                                                                                                                                                                                                                            |
| 3   | Shape-compat layer                      | new module in `@dxos/protocols`                                                                                   | low         | high       | Buf encode/decode reproducing the substituted shapes (PublicKey, PrivateKey, TimeframeVector, Any, Struct, Timestamp) plus byte/JSON-equality tests against protobuf.js. Nothing switches over, so risk stays low; gates #7 and #9.                                                                                                                     |
| 4   | `dxos.config`                           | 55 files                                                                                                          | low         | medium     | Read-mostly, not persisted, not signed — but a public API change, since `@dxos/config` re-exported the generated namespace. Landed natively; see findings.                                                                                                                                                                                              |
| 5   | devtools                                | 20 files                                                                                                          | low         | low–medium | Diagnostic-only; regressions are visible and harmless. Already on effect-rpc (verified — see below), so this is a type-import sweep that rides on #7, not an RPC-seam exercise.                                                                                                                                                                         |
| 6   | `Stream` extraction                     | 26 import sites                                                                                                   | low         | medium     | Move `Stream` out of `codec-protobuf` into its own package; unblocks deleting that package.                                                                                                                                                                                                                                                             |
| 7   | `protoMessage()` / `serviceError` → buf | One file: registry + shape-compat routing behind the existing API                                                 | medium      | low        | The chokepoint, as first rated: shapes are preserved so no call site changes. Blocked only on `Any` for 14 of 45 types. Surfaced the Struct double-encoding bug in `#3` — see above.                                                                                                                                                                    |
| 8   | Remaining `ServiceDescriptor` RPC       | 21 production `schema.getService()` sites / 11 services; 36 further sites are tests on `example.testing.*` protos | medium–high | high       | Cross-peer wire compatibility: a mismatch breaks replication between versions, not just a local call. Sequence after #6. `ServiceDescriptor` itself is only 8 references, all plumbing — the surface to migrate is `getService()` + `createProtoRpcPeer` (11 files, 21 sites). The test sites carry no wire risk and can go first to prove the pattern. |
| 9a  | keyring `KeyRecord`                     | `halo/keyring/src/{keyring,sqlite-keyring}.ts`                                                                    | medium      | low        | One message, two codec sites, local SQLite only. Smallest persisted slice — do it first to validate #3 against real on-disk rows.                                                                                                                                                                                                                       |
| 9b  | `echo.query.Heads`                      | `echo-host/src/automerge/sqlite-heads-store.ts`                                                                   | medium      | low        | One message, one codec site. Rebuildable from Automerge if a migration goes wrong, which caps the downside.                                                                                                                                                                                                                                             |
| 9c  | `echo/metadata` + `echo/feed`           | 3 codec sites (`metadata-store`, `sqlite-metadata-store`, `pipeline/codec`); 46 files touch the types             | medium–high | medium     | Broad on-disk state with no cheap rebuild path. `LargeSpaceMetadata` and `FeedMessage` are `Any`-blocked; `EchoMetadata` is safe but cannot be byte-identical — see below.                                                                                                                                                                              |
| 9d  | credentials signing/verification        | `halo/credentials/src/credentials/*`, 94 declarations                                                             | highest     | high       | `signing.ts` stringifies the _substituted object_, so any shape drift invalidates every existing credential. Do last, behind 9a–9c, with fixtures of real signed credentials from released versions.                                                                                                                                                    |

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
the repo forbids.

This still holds with `#7` landed: `#7` changed which codec writes the bytes, not the type
`protoMessage` exposes nor the substituted shape it decodes to. `#5` is ordered after the type
moves to `bufMessage` — i.e. after `#9c`/`#9d` — not after `#7`. See the correction under `#5`.

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
5. **`google.protobuf.Any`** needs a type registry to resolve, and the `preserve_any` field option
   to know when not to. Handled in `#3`; see above for the semantics reproduced.

   A prefixed `type_url` (`type.googleapis.com/example.Message`, which buf's own `anyPack` emits)
   deliberately stays packed rather than being resolved by its last path segment: the legacy codec
   gates on `schema.hasType(type_url)` and leaves it packed too, and resolving it would change the
   decoded shape of `Credential.subject.assertion` and so the canonical payload `signing.ts` signs.
   Normalise on the producer when something buf-native starts packing, never on this consumer.

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

## Structuring for teardown: the type surface, not the runtime

Migrating every runtime call site does **not** make `codec-protobuf` deletable. Of the 22 source
files outside the package that import it, most import only `type`s, and those split into three
groups with different fates:

| Group                                                                      | Symbols                                                                                                                                         | Fate                                |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| **Transport vocabulary** — describes the wire, contains no protobuf.js     | `Any`, `RequestOptions`, `EncodingOptions`, `Codec`, `ServiceBackend`, `ServiceProvider`, `ServiceDescriptorLike`                               | must **move**; nothing retires them |
| **Shape conventions** — the substituted shapes the compat layer reproduces | `WithTypeUrl`, `TaggedType`, `Struct`, `TypedProtoMessage`                                                                                      | retire with the shape-compat layer  |
| **protobuf.js machinery**                                                  | `compressSchema`, `anySubstitutions`, `structSubstitutions`, `timestampSubstitutions`, and the `Codec`/schema/mapping/sanitizer implementations | deleted with the package            |

The first group is what keeps the package alive past the migration. `hypercore/src/crypto.ts` and
`feed-store` want a thing with `encode`/`decode`; `messaging` and `blade-runner` want the `Any`
envelope; `client-services/pipeline/codec.ts` wants `Codec`. None of them is a protobuf.js
consumer, so no migration thread ever removes their import — the symbols have to leave instead.

**They cannot move into `@dxos/protocols`.** `hypercore` and `feed-store` live in `common/` and do
not depend on it; routing them through `core/protocols` would invert the layering. The transport
vocabulary needs a `common/`-level home of its own — a types-only package with no protobuf.js
dependency, which `codec-protobuf` then implements rather than defines.

Doing that extraction **before** the remaining threads is what makes the teardown a deletion rather
than a refactor: each thread that lands afterwards imports the vocabulary from its new home, so
`codec-protobuf`'s dependent list shrinks monotonically to zero instead of being re-established by
every new call site. Left to the end, the same work has to be done anyway, but against a wider set
of consumers and with the package still in the graph.

Ordering: extract the vocabulary → land what remains (`#5`'s 14 files, `#9c`'s `pipeline/codec`,
`#9d`'s type sweep, and `#2` whenever) against it → the package is then reachable only from
`protobuf-compiler` and its own tests, and goes with them in one commit.
