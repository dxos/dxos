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

| Surface                                                                  | Count                             |
| ------------------------------------------------------------------------ | --------------------------------- |
| `.ts`/`.tsx` files importing `@dxos/protocols/proto/*` (protobuf.js gen) | 290 files / 464 import statements |
| Files importing `@dxos/protocols/buf/*` (already migrated)               | 25 (dxos) + ~60 (edge)            |
| Files importing `@dxos/codec-protobuf`                                   | 39                                |
| `schema.getCodecForType(...)` call sites                                 | 47                                |
| `Stream` imports from `@dxos/codec-protobuf`                             | 26                                |

Heaviest legacy consumers (files importing `@dxos/protocols/proto/*`):
`sdk/client-services` (83), `core/mesh` (50), `core/halo` (28), `sdk/client` (23),
`devtools/devtools` (19), `plugins/plugin-space` (11).

Most-imported legacy modules: `dxos/client/services` (106), `dxos/halo/credentials` (94),
`dxos/config` (36), `dxos/echo/metadata` (31), `dxos/echo/feed` (22).

`dxos/edge` adds one direct dependent (`@dxos/hub-protocol` → `@dxos/codec-protobuf`) plus
`@dxos/protocols/proto/*` imports in `db-service`; its newer code already uses
`@dxos/protocols/buf/*` for credentials, keys, query and messenger.

## What actually has to be replaced

Codegen is solved; the cost is concentrated in four runtime behaviours protobuf.js gives us and
`@bufbuild/protobuf` does not:

1. **Substitutions.** `packages/core/protocols/src/proto/substitutions.ts` rewrites
   `dxos.keys.PublicKey` → `PublicKey`, `dxos.keys.PrivateKey` → `Buffer`,
   `dxos.echo.timeframe.TimeframeVector` → `Timeframe`, plus `Any`, `Struct` and `Timestamp`
   handling. Generated buf types are plain messages, so every one of the 464 import sites that
   touches a substituted field sees a different shape (`{ data: Uint8Array }` instead of a
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
| 4     | Mechanical rewrite of 464 `@dxos/protocols/proto/*` imports → `@dxos/protocols/buf/*` (largely codemod-able; the enum and `optional`/default-value differences are not)                                             | 2–3 weeks   |
| 5     | `@dxos/effect-proto` on buf descriptors (`react-ui-form`)                                                                                                                                                           | 3–5 days    |
| 6     | Delete `protobuf-compiler`, the `prebuild` task, `substitutions.ts`, `codec-protobuf`; drop `protobufjs` from the catalog; update `dxos/edge` (`hub-protocol`, `db-service`)                                        | 3–5 days    |

**Total: roughly 7–9 engineer-weeks**, of which phase 4 is the long tail and the only phase that
touches most of the repo. Phases 0–2 (~3 weeks) deliver the actual de-risking; stopping after
phase 1 already removes protobuf.js from the new RPC stack.

Main risks, in order: credential signature stability (2), decoded-shape drift silently changing
behaviour at 464 sites, and enum/default-value semantics differing between the two generators.
