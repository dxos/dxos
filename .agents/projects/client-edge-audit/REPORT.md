# Client–Edge Audit — Report

_2026-08-14 · project `client-edge-audit` · branch `claude/client-edge-audit-5e6a75`_

## TL;DR

1. **Inventory (goal 1): complete.** Every client→edge communication point is
   catalogued in [DESIGN.md](DESIGN.md) — `EdgeHttpClient`/`EdgeClient`
   constructions, every raw `fetch`/`WebSocket` in the client stack, and the
   config plumbing that feeds them.
2. **Offline operation (goal 2): verified, and it already worked.** With no
   edge endpoint in config the SDK boots silently: both edge clients are
   skipped, signaling falls back to `MemorySignalManager`, every replicator is
   double-gated, and the only boot log is a debug-level "P2P network is not
   configured". A new test pins this: DB round-trip succeeds with **zero
   network calls and zero WARN+ log entries**.
3. **No defaults (goal 3): fixed.** `@dxos/config` shipped two families of
   silent production-endpoint defaults: `defaultConfig` (written to first-run
   CLI profiles as `wss://dxos.network/` + ICE + IPFS) and
   `EDGE_SERVICE_DEFAULTS` (six workers). Both are deleted, all consumers
   updated to treat absence as "feature unavailable", and a config test pins
   the endpoint-free behavior. `configPreset` keeps its `edge: 'main'` default
   by decision — calling the preset factory is itself an explicit opt-in.

Everything builds (full-repo `:build` green), all touched-package tests pass,
lint + format clean.

## Goal 1 — Where the client talks to edge

Full detail in DESIGN.md; the shape of it:

- **The sanctioned path** is `@dxos/edge-client`: one WebSocket
  (`EdgeWsConnection`), the `/auth` challenge fetches, the authenticated
  HTTP-retry loop, and the AI proxy. Everything else in the SDK routes through
  injected `EdgeConnection`/`EdgeHttpClient` instances.
- **Boot constructions are all URL-gated.** `ClientServicesHost` (worker/host
  side) and `Client._open` (tab side) both construct edge clients only inside
  `if (runtime.services.edge.url)`. `ServiceContextLayer` returns the plain
  core stack when either client is missing. Worker boot defers the actual dial
  300ms past boot (PR #12585); node/CLI hosts dial on stack open.
- **Given a URL, two things activate with no feature flag**: the `EdgeClient`
  WebSocket itself and `FeedSyncerLayer`. Feature flags
  (`runtime.client.edgeFeatures.*`) gate signaling, replicators, and agents.
- **Downstream holders are inconsistent about absence** (silent skip vs
  invariant-throw vs throw-on-use via the `client.edge` getter) — acceptable
  where the throw is a user-initiated edge feature; none are boot-reachable.
- **echo/halo/protocols/common have zero direct network calls.** `@dxos/log`
  has no remote sink.
- **The boot-time dials that are NOT edge-gated live in `@dxos/observability`**
  (ipdata geolocation, PostHog init, OTLP exporters), keyed on their own env
  vars. Two consent-gating bugs found there (recorded as follow-ups): the
  ipdata provider runs before the `disabled` check, and the OTLP metrics
  exporter starts in a constructor, bypassing `disabled`.
- **One structural hard-coding**: `proxyFetchLegacy` →
  `https://cors.dxos.network`, used by ~13 plugins with no config channel at
  all (fires on feature use, never boot). Recorded as the top follow-up.

## Goal 2 — Offline config works

New test: [`packages/sdk/client/src/client/client-offline.test.ts`](../../../packages/sdk/client/src/client/client-offline.test.ts)

- Boots `new Client({ config: new Config() })` (nothing configured).
- Creates identity, space, object; flushes; queries it back.
- `fetch`, `globalThis.WebSocket`, and `isomorphic-ws` are replaced with
  recorders that fail any call; a log processor captures every WARN+ entry.
- Asserts both lists are empty. **Green on first run** — the SDK path needed no
  fixes.

Known remaining app-level (Composer, not SDK) noise, recorded in Phase 4:
the ipdata provider's every-boot
`log.warn('DX_IPDATA_API_KEY is not configured…')`, which a downgrade to debug
would silence but which is left alone here by request; and
`module-loader.ts:497` warns when a module legitimately contributes `[]`
because its endpoint is absent (plugin-file edge backend, plugin-client hub
client, now plugin-wnfs blockstore).

## Goal 3 — Defaults removed

In `@dxos/config` (the violations that mattered):

| Was                                                                                                                                                                 | Now                                                                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `defaultConfig` carried `edge.url: wss://dxos.network/` + ICE + IPFS, and `ConfigService.load()` **wrote it to `~/.config/dx/profile/<name>.yml`** on first CLI run | `defaultConfig` deleted; first runs write an **empty** profile and both load branches merge `profileBuiltinDefaults` (fixing the first-run branch that skipped it) |
| `configPreset()` defaulted `edge: 'main'`                                                                                                                           | **Kept by decision** — the preset factory call is an explicit opt-in                                                                                               |
| `EDGE_SERVICE_DEFAULTS` — six production workers; `getEdgeServiceEndpoint` could not return "absent"                                                                | constant deleted; returns `string \| undefined`; new `no-default-endpoints.test.ts` pins it                                                                        |

Consumers updated to handle absence explicitly:

- **pipeline-transcription** `Transcriber` — clear error naming the config path;
  plugin-transcription now threads the endpoint from config into the manager.
- **plugin-crm** `attach-image` — typed `Effect.fail` when neither the input
  nor `DX_CRM_IMAGE_SERVICE_URL` provides an endpoint.
- **plugin-support** feedback panel — screenshot upload skips (debug log) when
  the image service is unconfigured; Discord action already guarded.
- **plugin-calls** — `join()` invariants on the calls service endpoint.
- **plugin-devtools** — new `ToolsExplorerContainer` resolves the introspect
  endpoint from config; `react-ui-introspect`'s `ToolsExplorer` lost its
  `localhost:39476` default and renders a "not configured" message instead.
- **CLI hub commands** — `?? 'https://hub.dxos.network'` (two sites) → fail
  with `HubApiError('Hub URL is not configured (runtime.services.hub.url).')`.
- **sdk/client devtools hook** — no more `https://halo.dxos.org` fallback
  target when opening the devtools app.
- **client-protocol** — deprecated `DEFAULT_VAULT_URL` deleted (zero readers).
- **edge-client/service** — `DEFAULT_IMAGE_SERVICE_URL` export deleted (only
  tests read it; they now carry their own fixture URLs).
- **GptRealtime canvas shape / plugin-wnfs** — `localhost:8787` fallbacks
  removed (clear error / module contributes nothing, respectively).
- **composer-app dx.yml** — gained the `introspect` entry, so Composer keeps
  today's behavior through app config, which is the legitimate channel.

Deliberately kept: app-level `dx.yml` endpoints (that _is_ provided config),
explicit CLI choices (`dx profile create` templates, `--host` option defaults,
`configPreset` environments), and test-only mock URLs. The live image-service
e2e no longer defaults its target either — enabling `DX_RUN_IMAGE_SERVICE_E2E`
without `DX_IMAGE_SERVICE_URL` now fails loudly. Attempted then reverted as
out-of-scope: config-wiring the Coder skill's introspect MCP URL (plugin-code)
— recorded in Phase 4 with the other feature-time literals.

## Verification

- `moon exec :build` full-repo: **green, 0 TS errors** (includes the
  cross-package `getEdgeServiceEndpoint` return-type change).
- Tests: config (7), client (31, incl. the new offline test),
  pipeline-transcription (34), edge-client service (10), plugin-crm (15),
  plugin-code (7), plugin-transcription (2), plugin-wnfs (8), plugin-calls (2),
  plugin-devtools (1), cli (24), react-ui-canvas-compute (15) — **all passing**.
- `moon :lint` on all touched packages + `pnpm format`: clean (one translation
  key renamed to satisfy the key-format rule).

## What's next (Phase 4 backlog, in TASKS.md)

Top three by value: (1) route `proxyFetchLegacy` through config —
the last structural hard-coding; (2) first-class optional capability
contributions so offline Composer boot stops warning; (3) observability
consent-gating fixes (ipdata before `disabled`, OTLP metrics constructor
start, posthog init). The rest: plugin-script `?? ''` masking, `memoryConfig`
edge feature flags, npm `files:` hygiene for react-client/examples, retiring
the dead `react-edge-client` package, and the remaining feature-time literals
outside the client stack.
