# Tasks — protobuf.js → buf

Groups are the audit's ("The teardown: one dependency chain"). They are a **chain**, not parallel
slices: the generated bindings import `codec-protobuf` themselves, so nothing downstream can start
until everything upstream is done. Only groups 1 and 2 are independent of each other.

Counts below were re-measured on `main` at `2599ec3` and are lines / files unless stated.

## Current state

| Surface                                 | Then | Now                                                                                                                                                                                               |
| --------------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `protoMessage` service-RPC calls        | 33   | **1** — `QueryService.test.ts:47`, itself a regression test _for_ `protoMessage` (the protobuf.js Reader corrupting a >8KB payload with an astral character). It dies with the codec, not before. |
| `bufMessage` service-RPC calls          | 0    | 62                                                                                                                                                                                                |
| `codec-protobuf` package dependents     | 8    | 4 — three are the machinery (`codec-protobuf`, `protobuf-compiler`, `protocols`); the fourth is `blade-runner`'s single `import { type Any }`.                                                    |
| Registry importers (`schema` / `TYPES`) | 27   | 18                                                                                                                                                                                                |
| Subpath type imports (`proto/dxos/…`)   | 355  | 286 / 207                                                                                                                                                                                         |

The service-RPC surface is done. What is left is the **shape**: the generated types, their
substitutions, and the compat layer standing in for them.

## Done

- [x] Value codecs: `createCodecEncoding` takes a structural `ValueCodec<T>`; `hypercore`,
      `feed-store` and `client-services` off `codec-protobuf`.
- [x] Cross-codec agreement guard (258 messages / 518 cases, field-keyed divergence ledger).
- [x] Service RPCs to buf: identity, contacts, devices, spaces, devtools (snapshot/feed/metadata),
      invitation device profile, gossip `postMessage`/`subscribeMessages`.
- [x] The wire enums — `EdgeReplicationSetting`, `MembershipPolicy`, `SpaceState`, all three
      same-named `ConnectionState`s, `DeviceKind`, `DeviceType`. TS enums are nominal, so each was
      an all-or-nothing cut; `@dxos/client` re-exports three of them, so this is consumer-visible.
- [x] On-disk codecs to buf: `EchoMetadata` (both stores), `FeedMessage`, `Credential`.
- [x] `getBufService` for the RPC descriptor tests — established that `schema.getService` has **no**
      production callers; teleport, shell and websocket-rpc were already on buf descriptors.
- [x] Root `Any` substitution (`#12990`). Fixed a live defect: `space.postMessage` had been writing
      an empty `Any` since `#12158`, because the compat layer substituted an `Any` only as a _field_
      of a message. Serialized transports only — which is why no test caught it, and why Composer's
      worker-hosted `'viewing'` presence and the thread/review status channels sent empty payloads.
- [x] Golden credential vector (`testing/golden-credential.ts`) — bytes and signing payload from a
      build predating the codec move, with tests that both codecs verify it, both reproduce the
      payload byte for byte, and re-encoding is byte-identical.

## Group 1 — the shape (286 sites, 207 files) · CRITICAL PATH

Not an import swap, and **not a codec swap either**. Three things move together per site:

1. **Substitutions resolve.** `shape-compat.ts` substitutes six types; each is a call-site change,
   not a type change: `dxos.keys.PublicKey`/`PrivateKey` (a `PublicKey` class ↔ `{data}`),
   `dxos.echo.timeframe.TimeframeVector` (a `Timeframe` class), `google.protobuf.Timestamp`
   (a JS `Date` ↔ `{seconds: bigint, nanos}`), `google.protobuf.Struct`, and `google.protobuf.Any`.
2. **`'@type'` → buf's own typing.** The legacy `Any` substitution inlines the payload and keys it
   `'@type'`; buf carries `typeUrl` + bytes and messages carry `$typeName`. Narrowing moves from a
   string discriminator to `anyUnpack` against the registry.
3. **Presence handling.** buf loses proto3 `optional`, so each site handles absence, and `!` is
   barred.

Order by namespace — two are ~45% of the surface.

- [ ] `dxos/halo/credentials` — 81 / 81. The fence is **lifted**. 149 of these narrow an assertion
      by `'@type'` across 44 files; `getCredentialAssertion` accounts for 39 across 16.
      Credentials core itself now holds no protobuf.js codec — only type-only `TypedMessage`/`TYPES`
      in `assertions.ts`, `credential-factory.ts`, `credential-generator.ts` and
      `space-state-machine.ts`, which _are_ the package's public discriminated union.
- [ ] `dxos/client/services` — 48 / 48.
- [ ] `dxos/echo/feed` — 23 / 23. Signed feed blocks; wants cross-version feed fixtures.
- [ ] `dxos/halo/invitations` — 15 / 14.
- [ ] `dxos/echo/metadata` — 11 / 11.
- [ ] `dxos/edge/messenger` — 7 / 7.
- [ ] ~20 remaining namespaces, tail.

### 1a. Retire the shape-compat layer · part of group 1, not a step after it

The layer exists so a codec can swap without its call sites changing. Every use of it is therefore
**migration debt**, not an endpoint: ~48 bridge sites across ~30 files today, all added to move a
codec ahead of its consumers. They retire as the substitutions above resolve, and the layer is
deleted with the last one.

Ranked by how much shape each hides:

- [ ] Whole-message boundary bridges — `client-protocol/bridge-codec.ts` (18),
      `client/services/legacy-codec.ts` (11), `client-services/services/credentials-codec.ts` (8),
      `client-services/network/utils.ts` (8). These convert an entire message at a service seam.
- [ ] `Any` envelope bridges — `messaging/messenger.ts`, `mesh/rpc/rpc.ts`,
      `teleport/muxing/muxer.ts`, `teleport-extension-gossip/presence.ts`,
      `devtools/JsonView.tsx`, `devtools/useFeedMessages.tsx`, `devtools/useCredentials.tsx`.
      Go with item 2 above.
- [ ] `PublicKey` bridges — `halo/keyring/{keyring,sqlite-keyring}.ts`,
      `network-manager/signal/swarm-messenger.ts`, `edge-client/auth-challenge.ts`.
- [ ] `Timeframe` / on-disk bridges — `pipeline/codec.ts`, `echo-host/sqlite-heads-store.ts`,
      both metadata stores, `change-metadata.ts`, `sql-storage-diagnostics.ts`.
- [ ] `service-rpc.ts` and `buf/service.ts` — the layer's own consumers; last to go.

### 1b. Blocking design decision — the credential signing payload

A credential's signature covers `stableStringify` of its **decoded** shape, so every substitution in
that shape is part of the signature format. Two facts, both measured:

- Canonicalising a buf `Credential` does not merely differ — it **throws**
  (`Do not know how to serialize a BigInt`, the `Timestamp`'s `seconds`).
- Converting buf → substituted shape and then applying the existing payload logic is
  **byte-identical** to today.

So `getCredentialProofPayload` cannot take a buf message directly. Either it keeps a shape
conversion at that one boundary — the compat layer survives there alone, for signing only — or the
signature format changes, which makes every previously-issued credential unverifiable. **Pick one
before starting the credentials namespace.** The golden vector fails loudly either way.

Ordering constraint if the bridge is kept: the payload contains `"value":""` for the zeroed
`proof.value`, and proto3 omits an empty bytes field on a round-trip. Zero `proof.value` _after_
converting, never before.

## Group 2 — `codec-protobuf`'s direct consumers · parallel to group 1

- [ ] **Fix `protobuf-compiler`'s `file-generator.ts` first** — it emits
      `import type { RequestOptions } from '@dxos/codec-protobuf'` into every service stub, so the
      next `prebuild` undoes any sweep that skips it.
- [ ] `blade-runner/src/redis/rpc-codec.ts` — one `import { type Any }`, the only non-machinery
      dependent left. A one-file change whenever convenient.
- [ ] The RPC seam — `rpc` (2), `client-protocol` (2). Lands with the `Any` envelope, since
      `ServiceBackend.call(method, request: Any)` is typed on it. `RequestOptions` is removed, not
      retyped.
- [ ] `echo-client/repo-proxy.ts` `Struct` — a real type fix. Removing the cast means constraining
      `create<T>`, which ripples through echo-client's public API because a TS `interface` has no
      implicit index signature. Widening `DataService.initialValue` is the actual fix.

## Group 3 — the bindings · blocked on group 1

- [ ] Delete `protocols/src/proto/` (generated tree, `substitutions.ts`, `types.ts`), the `./proto`,
      `./proto/*` and `./proto/dxos/*.proto` export-map entries, and the `prebuild` task.
- [ ] The three deliberately cross-codec tests go with it, since they exist to compare the two
      codecs: `credentials/buf-compat.test.ts`, `presentations/json-encoding.test.ts`,
      `protocols/src/buf/{cross-codec,gossip-compat,shape-compat}.test.ts`, plus
      `mesh/rpc/{service-buf,service-type-url}.test.ts`.

## Group 4 — the two packages · blocked on groups 2 and 3

- [ ] Delete `@dxos/codec-protobuf` and `@dxos/protobuf-compiler`. The 8 generated fixtures under
      `protobuf-compiler/test/proto/gen` go with them.

## Group 5 — protobufjs · blocked on group 4

- [ ] Drop the `protobufjs: ^8.0.0` catalog pin.
- [ ] Clear the two string allowlists no import sweep can see:
      `composer-app/src/vite/optimize-deps.ts` (2 entries) and
      `app-framework/src/vite-plugin/packages.ts`.

## Standing instruction

Everything remaining — groups 1 through 5, including retiring the shape-compat layer — lands as a
**single PR**. Do not chunk it further and do not interrupt for confirmation.

§1b is decided: **the signature format does not change.** `getCredentialProofPayload` keeps a shape
conversion at that one boundary, named for what it is (the credential signing shape) rather than
surviving as generic compat scaffolding. Every previously-issued credential stays verifiable, and
the golden vector is the guard.
