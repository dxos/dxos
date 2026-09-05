# @dxos/config

## 0.12.0

### Minor Changes

- 22bea85: `@dxos/config` is converted to buf (`@bufbuild/protobuf`) and no longer depends on protobuf.js.

  **Breaking** (riding the minor, per the pre-1.0 policy): `defs` and `ConfigProto` now come from the buf-generated module, which renders nested
  types flat — `Runtime.Client.ServicesMode` is `Runtime_Client_ServicesMode`, and so on for every
  nested message and enum. Config _inputs_ (loaders, savers, the `Config` constructor) take the new
  `ConfigInit` type; `Config.values` is a buf message, so it carries `$typeName` and compares against
  `toJson(ConfigSchema, …)` rather than a plain object.

  `runtime.app.env` is a `google.protobuf.Struct`, so its values are typed `JsonValue` rather than
  `any`. `getEnvString(config, key)` reads a string out of it, returning `undefined` for any other
  JSON value.

  `validateConfig` normalises through `create(ConfigSchema, …)` instead of running the protobuf.js
  `verify` pass; field types are checked by the compiler through `ConfigInit`. Loaders that read
  untrusted YAML should validate as they parse.

  `@dxos/protocols` gains `bufMessage()` alongside `protoMessage()`: an Effect codec for a buf message
  type with the same wire format, used by `SystemService.getConfig`.

- b4c7782: Remove implicit EDGE endpoint defaults: `getEdgeServiceEndpoint` returns `undefined` when `runtime.services.edgeServices` does not configure a service, and edge-dependent features render an unconfigured state or fail with a named configuration error instead of silently targeting DXOS-operated hosts. A client booted with an endpoint-free config performs no network activity and logs no warnings; transcription now rejects at `open()` with `TranscriptionEndpointNotConfiguredError` rather than falling back to a built-in host.
- 6c6987e: EDGE's own entrypoint is now one host per environment -- `https://dxos.network` (production),
  `https://preview.dxos.network`, `https://dev.dxos.network` and `http://localhost:8787` -- exposed as
  `EDGE_URLS` in `@dxos/config`, which `configPreset`, `defaultConfig` and the CLI profile templates
  resolve against instead of holding their own strings. The dev tier moves off
  `edge.dxos.workers.dev` onto `dev.dxos.network`, which the same worker already serves.

  hub-service is now reached at `<edge>/hub`, so a service base URL can carry a path. `HubHttpClient`
  normalizes its base to a trailing slash and issues relative request paths, since
  `new URL('/account/me', base)` would otherwise discard the prefix; a caller passing its own base URL
  gets the same treatment. `EdgeHttpClient.getSpaceTriggers` and `getTriggersDispatcherStatus` now
  call `/compute/triggers/:spaceId`, the prefixed form of a path that still answers unprefixed.

### Patch Changes

- 069e8ed: Give the CLI's `main` profile template full parity with Composer's local dev config (edge, ICE, sandbox, IPFS), and auto-default new profiles to it when running the CLI from a monorepo checkout via `DX_LOCAL_DEV`.
- c01fef6: `Config` now strips the protobuf-es `$typeName` marker from every source before merging, so passing an existing message — such as `configPreset(...).values` — no longer produces a `Config.values` that `toBinary` cannot encode.

  `lodash.defaultsdeep` copied `$typeName` onto plain objects that came from another source; protobuf-es then treated those objects as already-constructed messages and skipped normalising their plain descendants. The malformed tree failed to serialise across the worker RPC boundary, which is how `SystemService.getConfig()` terminated the renderer under `DEDICATED_WORKER`.

  Unknown wire fields are preserved: `MessageInitShape` excludes `$unknown`, so `Config` copies those records back onto the normalised message, and a source decoded from the wire keeps fields this build's schema does not know.

- 3e02201: Default service URLs follow the EDGE environment rename (DX-1150): the config preset and CLI profile
  templates gain `preview` (with `main` preserved as a deprecated alias of the same worker), the default
  edge URL moves to `https://preview.dxos.network`, and the Image/Introspect service defaults become the
  production hostnames (`image.dxos.network`, `introspect.dxos.network/mcp`), including
  `@dxos/edge-client`'s `DEFAULT_IMAGE_SERVICE_URL` (the retired `image-service-main` workers.dev
  name no longer resolves).
- ed43a8d: Every EDGE service is now addressed as `<env>.dxos.network/<service>`, derived from one configured
  entrypoint. `getEdgeServiceEndpoint` falls back to `runtime.services.edge.url` plus the service's
  path prefix, so configuring EDGE configures calls, image, transcription, discord, the CORS proxy,
  introspect and sandbox with it; `runtime.services.edgeServices` stays as the per-service override and
  no longer has to be populated. An unconfigured client still resolves nothing.

  No client path contains `/api/<service>` any more: the calls API moved from `/api/calls` to
  `<edge>/calls/rtc`, sandbox-service's REST API from `<host>/api/sandbox` to `<edge>/sandbox`, and the
  CORS proxy from `cors.dxos.network` to `<edge>/cors-proxy`. Video transcripts are fetched directly rather
  than through the CORS proxy, since the EDGE entrypoint sends CORS headers that the worker's own
  hostname did not.

  Requires the paired `dxos/edge` change to be deployed to production FIRST. That change is additive —
  every path a released Composer calls keeps answering — so the two can land in either order without an
  outage, but a build made from this commit only works against an EDGE that serves the prefixes.

  `configPreset({ sandbox })` sets `runtime.services.sandbox.url` only for `local`; the deployed
  sandbox-service is reached through EDGE.

- 48ea128: Resolve the hub URL outside the browser: `DX_HUB_URL` and other `DX_*` environment variables now
  apply to node config loads, `runtime.services.hub.url` and a built-in default back up
  `runtime.app.env.DX_HUB_URL`, and `dx account` commands no longer fail with "Hub URL not
  configured".
- Updated dependencies [e954c0f]
- Updated dependencies [9ef5485]
- Updated dependencies [22bea85]
- Updated dependencies [b4ceea2]
- Updated dependencies [bdb02cd]
- Updated dependencies [48eb05d]
- Updated dependencies [73daef4]
- Updated dependencies [4e417e9]
- Updated dependencies [23d2d8c]
- Updated dependencies [e56276b]
- Updated dependencies [4689d66]
- Updated dependencies [e207c68]
- Updated dependencies [4663f24]
- Updated dependencies [2896a58]
- Updated dependencies [9e91762]
- Updated dependencies [f8bfba0]
- Updated dependencies [e8088ea]
- Updated dependencies [85e6347]
  - @dxos/protocols@0.12.0
  - @dxos/client-protocol@0.12.0
  - @dxos/util@0.12.0
  - @dxos/log@0.12.0
  - @dxos/invariant@0.12.0
  - @dxos/node-std@0.12.0

## 0.11.1

### Patch Changes

- @dxos/client-protocol@0.11.1
- @dxos/invariant@0.11.1
- @dxos/log@0.11.1
- @dxos/node-std@0.11.1
- @dxos/protocols@0.11.1
- @dxos/tracing@0.11.1
- @dxos/util@0.11.1

## 0.11.0

### Minor Changes

- 41141d8: Default edge replication to the Subduction sedimentree transport: the built-in client config now enables `edgeFeatures.subductionReplicator` instead of `edgeFeatures.echoReplicator`. Set `subductionReplicator: false` (and `echoReplicator: true`) to restore the previous Automerge edge replicator.

### Patch Changes

- Updated dependencies [3f1fc67]
- Updated dependencies [6df314a]
- Updated dependencies [962c8cd]
- Updated dependencies [f6a01e3]
- Updated dependencies [c727a43]
- Updated dependencies [114fb98]
- Updated dependencies [b591791]
- Updated dependencies [f15c632]
- Updated dependencies [c727a43]
- Updated dependencies [08a3eea]
  - @dxos/util@0.11.0
  - @dxos/client-protocol@0.11.0
  - @dxos/protocols@0.11.0
  - @dxos/log@0.11.0
  - @dxos/tracing@0.11.0
  - @dxos/invariant@0.11.0
  - @dxos/node-std@0.11.0
