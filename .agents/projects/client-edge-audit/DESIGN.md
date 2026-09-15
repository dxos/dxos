# Client–Edge Audit — Design

## Goal

Make the DXOS client run cleanly **without** an edge connection:

1. **Complete inventory** of every point where the client communicates with
   edge — `EdgeHttpClient`, `EdgeClient` (websocket), and ad-hoc `fetch`/
   `WebSocket` call sites.
2. **Offline config is first-class**: with no edge endpoint in config, the
   database works, there is **no network activity**, and **no warnings or
   errors** are logged.
3. **No defaults**: nothing in code or bundled config silently falls back to an
   edge endpoint when the config omits one.

Scope: the client stack (`@dxos/client`, `@dxos/client-services`, echo/halo/
mesh cores, `@dxos/edge-client` consumers). Composer plugin usage is inventoried
for completeness but fixes target the SDK.

## Findings

### Edge client constructions

All construction sites of `@dxos/edge-client` classes (audited 2026-08-14).
**Nothing constructs an edge client when `runtime.services.edge.url` is absent** —
every boot-path construction is URL-gated. Given a URL, though, `EdgeClient`
(WebSocket) + `FeedSyncerLayer` activate with **no feature flag**.

Boot path (SDK):

- `ClientServicesHost` — [service-host.ts:436](packages/sdk/client-services/src/packlets/services/service-host.ts): reads
  `runtime.services.edge.url`; `if (endpoint)` constructs **both** `EdgeClient`
  (`deferConnect: true`, stub identity, dial happens in `startNetworking()`) and
  `EdgeHttpClient`. Without a URL `#edgeConnection` stays undefined and
  `startNetworking()` early-returns. Signaling needs the double gate
  (connection + `runtime.client.edgeFeatures.signaling`), else
  `MemorySignalManager`.
- `ServiceContextLayer` — [service-context.ts:155](packages/sdk/client-services/src/packlets/services/service-context.ts): `if (!edgeConnection || !edgeHttpClient) return core;`
  — the clean non-edge stack; downstream `Effect.serviceOption` resolves to none.
  In the edge branch `FeedSyncerLayer` is unconditional (no feature flag);
  replicator layer gated by `edgeFeatures.subductionReplicator`.
- `Client._open` — [client.ts:476](packages/sdk/client/src/client/client.ts): `if (edgeUrl)` dynamic-imports
  `@dxos/edge-client`, builds the tab-side `EdgeHttpClient` + `ClientEdgeAPI` +
  registers the default edge blob backend. `client.edge` getter **throws**
  (`invariant`) when edge unconfigured — every `client.edge.http` consumer
  inherits a throw-on-use failure mode.
- Worker boot ([worker-runtime.ts:156](packages/sdk/client-services/src/packlets/worker/worker-runtime.ts)) uses `autoConnect: false` and schedules
  `startNetworking()` post-boot (PR #12585); node/local boot
  ([local-client-services.ts:246](packages/sdk/client/src/services/local-client-services.ts)) defaults `autoConnect: true`.

Holders downstream (all gated, three inconsistent absent-URL policies):

- Silent/logged skip: `DataSpace` feed replicator + `NotarizationPlugin`
  (`edgeConnection && edgeFeatures.feedReplicator`), `EdgeInvitationHandler`
  (logs "edge disabled"), `EdgeAgentManager._open`, `DevicesService`/
  `NetworkService`/`EdgeAgentService` (optional-chained status fallbacks),
  `halo-adapter-client` `getEdgeIdentity` → `Option.none`.
- Throw at call time: `IdentityRecoveryManager` (`invariant('Not connected to EDGE.')`),
  `EdgeAgentManager.createAgent`, `NotarizationPlugin.setActiveEdgePollingEnabled`,
  `client.edge` getter, `useEdgeClient` (react-edge-client),
  `app-toolkit` `createHubClient` (hub URL), several plugins
  (assistant model resolver, connector coordinator, onboarding shared,
  calls). These are acceptable only for user-initiated edge features; anything
  reachable from boot must not throw.

Out-of-config endpoints (violations of goal 3 by spirit, as audited):

- `proxyFetchLegacy` — [cors-proxy.ts:9](packages/core/mesh/edge-client/src/cors-proxy.ts) hard-codes
  `https://cors.dxos.network`; used by ~13 plugins + websearch fetch; marked
  TEMPORARY in-source. Only fires on explicit feature use, not boot. **Still
  open — Phase 4 follow-up.**
- CLI hub util fell back to literal `'https://hub.dxos.network'`
  ([cli hub/util.ts](packages/devtools/cli/src/commands/hub/util.ts)). Removed
  here, restored on merge by PR #12642 (2026-08-17) as a `DEFAULT_HUB_URL`
  builtin, then **removed again by decision (Mykola, 2026-08-18)**: the constant
  survives as the value written into a created profile, but no CLI read falls
  back to it — `hubBaseUrl` fails with `HubApiError` instead.

Notable secondary findings:

- Up to ~6 independent `EdgeHttpClient` instances per booted app (host, tab,
  plugin-registry pre-client, assistant, connector, onboarding per-call), each
  with its own identity/auth state.
- Dead surface: `react-edge-client`'s only hook `useEdgeClient` has zero call
  sites (package kept alive by one type import in plugin-transcription);
  `browser-rendering.ts` types and the `./muxer` subpath export have zero
  consumers.
- Private-field reach-through of `_authHeader` in plugin-registry and
  plugin-connector (TODO for a public API).

### Direct network call sites

**With `runtime.services.edge.url` absent, the client stack makes zero network
calls.** Every socket/fetch in the SDK is either behind the edge-URL gate or
lazy on explicit action. echo/halo/protocols/common have **no** direct network
calls at all (`@dxos/log` has no remote sink; edge replicators only use injected
connections). Inventory:

- `@dxos/edge-client` — the sanctioned layer: the only WebSocket
  ([edge-ws-connection.ts:136](packages/core/mesh/edge-client/src/edge-ws-connection.ts)), the `/auth` challenge fetches
  ([auth-challenge.ts:169](packages/core/mesh/edge-client/src/auth-challenge.ts), [edge-client.ts:392](packages/core/mesh/edge-client/src/edge-client.ts)), the generic
  authenticated fetch loop (base-http-client), the AI proxy path, and
  `proxyFetchLegacy` → hard-coded `https://cors.dxos.network` (explicit-call
  only, but ungated by any config).
- `@dxos/network-manager` — ICE-provider fetch ([ice.ts:25](packages/core/mesh/network-manager/src/signal/ice.ts)) and
  `RTCPeerConnection` fire only when an RTC connection is being built, gated on
  `runtime.services.iceProviders`/`signaling`; no literal STUN/TURN lists in
  source (they live in app dx.yml). ICE fetch suppresses `log.error` on
  localhost only.
- `@dxos/websocket-rpc` — two consumers: `#devtoolsProxy` (dead code, warns and
  skips) and agent-hosting (explicit action, `runtime.services.agentHosting`).
- `@dxos/client` — agent-hosting fetches (invariant-gated, explicit),
  devtools-app probe (`http://localhost:5174` on `openDevtoolsApp()` only),
  loopback debug port (127.0.0.1:9321, user-initiated).
- `@dxos/config` — `Dynamics()` is the sole network loader
  (`${publicUrl}/.well-known/dx/config`; **not called anywhere in-repo**);
  Remote/Envs/Defaults/Local/Storage are network-free.
- `@dxos/rpc-tunnel`, `worker-framework`, `react-client`, `shell`,
  `client-protocol` — no network.

**Boot-time dials that are NOT edge-gated (observability; fire in Composer
before/around `Client.initialize()`, main thread + dedicated worker):**

| Site                                                                                       | Endpoint                                        | Gate                                    | Issue                                                                                                                                   |
| ------------------------------------------------------------------------------------------ | ----------------------------------------------- | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| [ip-data.ts:59](packages/sdk/observability/src/providers/ip-data.ts)                       | `https://api.ipdata.co`                         | `DX_IPDATA_API_KEY` present             | **Runs before/independent of the `disabled` check** (still open). It also `log.warn`s at every boot when the key is absent (still open) |
| [posthog/extension.ts:103](packages/sdk/observability/src/extensions/posthog/extension.ts) | `DX_POSTHOG_API_HOST` (`/flags` + `/e` on init) | apiKey + host present                   | `initialize()` has no `disabled` check; composer's `POSTHOG_DISABLED_CONFIG` only suppresses autocapture                                |
| [otel/metrics.ts:25](packages/sdk/observability/src/extensions/otel/metrics.ts)            | `${DX_OTEL_ENDPOINT}/v1/metrics` every 60s      | endpoint + `metrics: true`              | **Exporter starts in the constructor, bypassing `if (disabled)` in `extension.ts:154`**                                                 |
| otel traces/logs                                                                           | `${DX_OTEL_ENDPOINT}/v1/{traces,logs}`          | endpoint + `!disabled`                  | correctly gated                                                                                                                         |
| [plugin-manifest.ts:115](packages/sdk/app-framework/src/core/plugin-manifest.ts)           | persisted remote-plugin URLs                    | localStorage entries (empty by default) | fine                                                                                                                                    |

PR #12585 context: it defers only the edge dial (worker sets `autoConnect:
false`, dials 300ms post-boot); `fromHost`/CLI/Node still dial on stack open
(`autoConnect` default `true`). Observability is untouched by it.

Non-client-stack feature endpoints worth flagging: pipeline-transcription
`fetch(${endpoint}/transcribe)` defaulted to `https://calls.dxos.network` via
`EDGE_SERVICE_DEFAULTS` (**removed in this PR** — the endpoint is threaded from
config and `_open` fails without it); a test fixture hitting live
`api.coindesk.com` (compute-hyperformula) and `free.ratesdb.com`
(functions-testing) remains.

### Config plumbing & defaults

Config schema is protobuf-only ([config.proto](packages/core/protocols/src/proto/dxos/config.proto)):
endpoint fields under `runtime.services.*` = `edge.url`, `ai.server`, `hub.url`,
`sandbox.url`, `edgeServices[]` (name/endpoint/props), `signaling[].server`,
`ice[]`/`iceProviders[]`, `ipfs.*`, `agentHosting.server`; feature gates under
`runtime.client.edgeFeatures.{feedReplicator,subductionReplicator,signaling,agents}`.
Hub reaches apps two unrelated ways: `runtime.services.hub.url` (CLI) and
`runtime.app.env.DX_HUB_URL` (Composer).

**Absent-config boot behavior (today, verified by code trace):** a
`new Client({ config: new Config() })` boots with **zero edge activity and zero
SDK warnings/errors** — `service-host.ts` skips both edge clients, signaling
falls back to `MemorySignalManager`, every replicator is double-gated,
`local-client-services.ts:112` logs "P2P network is not configured" at **debug**
level only. Edge-touching invariants (`client.edge` getter, identity recovery,
agent create, plugin resolvers) throw only on explicit use, never during
`initialize()`. The known **spurious warning** is app-framework's
[module-loader.ts:497](packages/sdk/app-framework/src/core/plugin-manager/module-loader.ts)
"module did not contribute all declared capabilities", fired by modules that
deliberately contribute `[]` when their endpoint is absent (plugin-file edge
backend, plugin-client hub client).

**Defaults that violated goal 3 (SDK code) — pre-fix audit snapshot.** Outcomes:
`defaultConfig` and `EDGE_SERVICE_DEFAULTS` deleted, CLI hub / devtools /
GptRealtime / plugin-wnfs / `DEFAULT_VAULT_URL` / image-service fallbacks
removed (TASKS.md Phase 3); `configPreset` kept by decision; `memoryConfig`,
plugin-script `?? ''`, and the standalone feature-time literals remain open
(Phase 4).

| Site                                                                                    | Default                                                                                                                                                                                                                                                                                                                                                       | Severity                                                       |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| [config-service.ts:30](packages/sdk/config/src/config-service.ts) `defaultConfig`       | `edge.url: wss://dxos.network/` + ICE + IPFS; `ConfigService.load()` **writes it to `~/.config/dx/profile/<name>.yml`** on first run                                                                                                                                                                                                                          | High — materializes production edge without consent (CLI path) |
| [edge-services.ts:27](packages/sdk/config/src/edge-services.ts) `EDGE_SERVICE_DEFAULTS` | 6 production endpoints (calls, transcription, image, discord, cors-proxy, introspect); `getEdgeServiceEndpoint` returns `config ?? DEFAULT` typed `string` — absence is unrepresentable                                                                                                                                                                       | High — 7 consumers silently inherit production                 |
| [preset.ts:41](packages/sdk/config/src/preset.ts) `configPreset`                        | zero-arg default `edge = 'main'` → `https://main.dxos.network`                                                                                                                                                                                                                                                                                                | Medium — exported SDK API; current consumers are tests/e2e     |
| [config-service.ts:17](packages/sdk/config/src/config-service.ts) `memoryConfig`        | all 4 `edgeFeatures: true` with no URL                                                                                                                                                                                                                                                                                                                        | Low — flags without endpoint                                   |
| Loose fallbacks                                                                         | CLI hub `?? 'https://hub.dxos.network'` (×2, superseded by `DEFAULT_HUB_URL` in PR #12642), [devtools.ts:224](packages/sdk/client/src/devtools/devtools.ts) `?? 'https://halo.dxos.org'`, GptRealtime + plugin-wnfs `?? 'http://localhost:8787'`, plugin-script `?? ''` (×3, masks absence)                                                                   | Medium                                                         |
| Standalone literals                                                                     | [cors-proxy.ts:9](packages/core/mesh/edge-client/src/cors-proxy.ts) `https://cors.dxos.network`; [service/Image.ts:22](packages/core/mesh/edge-client/src/service/Image.ts) image-service default; plugin-video transcription endpoint; plugin-code introspect MCP; deprecated `DEFAULT_VAULT_URL` (no readers); assistant-toolkit discord/browser skill URLs | Medium — feature-time, not boot                                |

**Not violations (bundled config is clean):** `@dxos/config` ships no
defaults.yml/envs-map.yml; browser `Defaults()`/`Envs()`/`Local()` read
`__CONFIG_*__` defines populated from the **app's own** `dx.yml`/`dx-env.yml`
(absent define ⇒ `{}`). App-level dx.yml files set production edge for
composer-app/todomvc/tasks (acceptable: that IS provided config). Test builders
(`sdk/client` TestBuilder, client-services testing) use bare `new Config()` —
clean. Minor: `react-client`/`examples` lack a `files:` allowlist so their
legacy dx.yml (kube signaling, no edge) would ship to npm; devtools
`EdgeSelector` persists an override into localforage `org.dxos.settings.config`
which Composer reads first — an invisible override channel, not a default.

## Decisions

1. **Absent edge config is silent and clean at boot.** No warnings, no errors,
   no network. Edge-dependent features fail at **use** time with a clear,
   named-config-path error (invariant / typed `Error` / `Effect.fail`), or
   render an explicit "not configured" state for UI surfaces. Boot-reachable
   paths never throw and never warn.
2. **`@dxos/config` ships zero implicit endpoints — but a created profile states
   its own.** Revised by decision (Mykola, 2026-08-18) from the original "empty
   first-run profile": the objection was never that a CLI user ends up pointed at
   DXOS hosts, it was that code substituted them invisibly on every load. So
   `ConfigService.load` writes `defaultProfileEndpoints` (hub, edge, ICE, IPFS;
   PR #12658's `localDevConfig` forks the written edge URL under `DX_LOCAL_DEV`,
   a creation-time choice, not a read-time substitute)
   into the profile it creates, where the user can read and change them, and
   **nothing falls back afterwards** — `profileBuiltinDefaults` carries only
   features and storage (which track the code), and the CLI's `hubBaseUrl` fails
   with `HubApiError` when the profile has no hub URL. This also reverses PR
   #12642's `DEFAULT_HUB_URL` fallback for the CLI, which now supplies the value
   written at creation rather than a silent default; `Account.getHubUrl`
   (app-toolkit, browser surface) still falls back and is out of scope here.
   `EDGE_SERVICE_DEFAULTS` is deleted and `getEdgeServiceEndpoint` returns
   `string | undefined` so absence is representable. Pinned by
   `no-default-endpoints.test.ts`. **`configPreset` keeps its `edge = 'main'`
   default** — calling the preset factory is itself an explicit opt-in.
3. **Apps opt in via their own dx.yml** — that is the acceptable channel for
   production endpoints (composer-app now also carries `introspect`). App
   config ≠ SDK default.
4. **Test-only literals are acceptable** (mock base URLs, the env-gated
   image-service e2e that deliberately targets the production worker).
5. **Offline invariant is pinned by a test** —
   `packages/sdk/client/src/client/client-offline.test.ts` boots a client on an
   empty `Config`, round-trips the database, and asserts zero network calls
   (fetch/WebSocket/isomorphic-ws intercepted) and zero WARN+ log entries.
6. **Explicit CLI choices stay** — `dx profile create` environment templates
   and `--host` option defaults are user-invoked selections, not silent
   fallbacks; they are documented in TASKS.md Phase 4 for visibility only.
