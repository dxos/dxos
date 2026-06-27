# Client Configuration Audit

Audit of client/runtime configuration usage across the monorepo, the EDGE
(Cloudflare Worker) services it points at, and the state of
[`config.proto`](../../core/protocols/src/proto/dxos/config.proto).

Goals:

1. Catalogue every EDGE service (anything served from `*.dxos.workers.dev`, plus
   the `*.dxos.network` / `*.dxos.org` siblings) and where its URL comes from.
2. Find hard-coded service URLs scattered across plugins/apps that should instead
   resolve from config.
3. Audit `config.proto` fields — flag the ones no longer read in code so they can
   be deprecated.
4. Propose an abstraction that replaces the one-field-per-service sprawl with a
   map of service configurations (endpoint + service-specific props).

> Scope note: this is the static-analysis phase. The cleanup is staged — see
> [§6 Cleanup plan](#6-cleanup-plan). Phase 1 (this change) consolidates the
> definitions into `config.proto` and deprecates dead fields; the call-site
> migration (removing the hard-coded strings) follows.

---

## 1. How config flows today

```text
config.proto  ──build-protobuf──▶  @dxos/protocols (ConfigProto type)
     │
     ├── dx.yml            static per-app values            (production URLs)
     ├── dx-env.yml        env-var → config-path mapping     (DX_* overrides)
     ├── dx-local.yml      local-dev overrides
     │
     └── @dxos/config
            ├── defaultConfig / memoryConfig  (config-service.ts)  ← hard-coded fallbacks
            ├── configPreset({ edge })         (preset.ts)          ← hard-coded per-env URLs
            └── loaders/savers                 (browser/node)
```

Three independent sources currently encode the same URLs:

| Source                                                          | What it sets                                                        |
| --------------------------------------------------------------- | ------------------------------------------------------------------- |
| [`config-service.ts`](src/config-service.ts) `defaultConfig`    | `edge.url`, `iceProviders`, `ai.server`, `ipfs.*`                   |
| [`preset.ts`](src/preset.ts) `configPreset`                     | `edge.url`, `sandbox.url` per `local/dev/main/production`           |
| [`composer-app/dx.yml`](../../apps/composer-app/dx.yml)         | production `edge`, `iceProviders`, `ai`, `sandbox`, `ipfs`          |
| [`composer-app/dx-env.yml`](../../apps/composer-app/dx-env.yml) | `DX_EDGE_BASE_URL`→`edge.url`, `DX_EDGE_AI_SERVICE_URL`→`ai.server`, `DX_SANDBOX_SERVICE_URL`→`sandbox.url` |

The production EDGE host (`edge-production.dxos.workers.dev`) and AI host
(`ai-service.dxos.workers.dev`) are duplicated across all four. Any other service
(calls, image, discord, transcription, …) is not in config at all — it is a
string constant in the consuming plugin.

---

## 2. EDGE services catalogue

All distinct services reachable at `*.dxos.workers.dev` and the related
`*.dxos.network` / `*.dxos.org` hosts. The **Source** column is the cleanup
signal: `config` = already resolvable from `config.proto`; `HARDCODED` = string
constant to migrate.

| Service            | Hosts (env variants)                                                                                     | Source                                                                                                                                                                                                                             | Purpose                                                           |
| ------------------ | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| **edge**           | `edge.dxos.workers.dev` (dev), `edge-main`, `edge-labs`, `edge-production`, `edge-dev`, `localhost:8787` | **config** `runtime.services.edge.url`                                                                                                                                                                                             | Core mesh: signaling, echo/feed replication, agents, ICE (`/ice`) |
| **ai**             | `ai-service.dxos.workers.dev`, `ai-service-labs.dxos.workers.dev`                                        | **config** `runtime.services.ai.server` — read at [`GptRealtime.tsx:66`](../../ui/react-ui-canvas-compute/src/shapes/GptRealtime.tsx)                                                                                              | LLM proxy (`/provider/anthropic`)                                 |
| **hub**            | `hub.dxos.network`, `hub-staging.dxos.workers.dev`                                                       | **mixed**: `runtime.services.hub.url` ([`hub/util.ts:22`](../../devtools/cli/src/commands/hub/util.ts)) **vs** `app.env.DX_HUB_URL` ([`onboarding.ts:19`](../../apps/composer-app/src/plugins/welcome/capabilities/onboarding.ts)) | Credential/identity hub                                           |
| **ipfs**           | `api.ipfs.dxos.network/api/v0`, `gateway.ipfs.dxos.network/ipfs`                                         | **config** `runtime.services.ipfs.{server,gateway}`                                                                                                                                                                                | IPFS API + gateway                                                |
| **calls**          | `calls-service.dxos.workers.dev`                                                                         | **HARDCODED** `CALLS_URL` [`plugin-calls/src/calls/types.ts:16`](../../plugins/plugin-calls/src/calls/types.ts)                                                                                                                    | WebRTC call signaling (`/api/calls`)                              |
| **transcription**  | `calls-service.dxos.workers.dev`, `transcription.dxos.network`                                           | **HARDCODED** [`plugin-transcription/src/transcriber/transcriber.ts:19`](../../plugins/plugin-transcription/src/transcriber/transcriber.ts)                                                                                        | Audio/video transcription                                         |
| **image**          | `image-service-main.dxos.workers.dev`                                                                    | **HARDCODED** ×2: [`plugin-crm/.../attach-image.ts:22`](../../plugins/plugin-crm/src/operations/attach-image.ts), [`plugin-support/.../screenshot.ts:28`](../../plugins/plugin-support/src/containers/FeedbackPanel/screenshot.ts) | Screenshot/image hosting (`/thumbnail`)                           |
| **discord**        | `discord-service.dxos.workers.dev`                                                                       | **HARDCODED** `DISCORD_SERVICE_URL` [`plugin-support/src/constants.ts:11`](../../plugins/plugin-support/src/constants.ts)                                                                                                          | Discord feedback bridge                                           |
| **cors-proxy**     | `cors-proxy.dxos.workers.dev`                                                                            | **HARDCODED** `LEGACY_CORS_PROXY_URL` [`edge-client/src/cors-proxy.ts:9`](../../core/mesh/edge-client/src/cors-proxy.ts)                                                                                                           | Legacy open CORS proxy                                            |
| **api-proxy**      | `api-proxy.dxos.workers.dev`                                                                             | **HARDCODED** [`assistant-toolkit/.../discord/operations/fetch-messages.ts:32`](../../core/compute/assistant-toolkit/src/blueprints/discord/operations/fetch-messages.ts)                                                          | Generic 3rd-party API proxy                                       |
| **introspect**     | `introspect-service-labs.dxos.workers.dev/mcp`, `edge.dxos.workers.dev/introspect/mcp`                   | **HARDCODED** ×2: [`plugin-debug/.../react-surface.tsx:64`](../../plugins/plugin-debug/src/capabilities/react-surface.tsx), [`plugin-code/src/blueprints/coder.ts:34`](../../plugins/plugin-code/src/blueprints/coder.ts)          | MCP introspection server                                          |
| **chat-agent**     | `chat-agent-labs.dxos.workers.dev`, `localhost:8791`                                                     | **HARDCODED** `MAIN_CHAT_AGENT_URL` [`composer-crx/src/config.ts:15`](../../apps/composer-crx/src/config.ts)                                                                                                                       | Conversational agent (CRX)                                        |
| **playwright-mcp** | `playwright-mcp-example.dxos.workers.dev/sse`                                                            | **HARDCODED** (test/blueprint fixture) [`assistant-toolkit/.../browser/blueprint.ts:29`](../../core/compute/assistant-toolkit/src/blueprints/browser/blueprint.ts)                                                                 | Browser-automation MCP (example)                                  |

### Other hard-coded `*.dxos.workers.dev` occurrences (non-source, lower priority)

These are config YAML, env files, stories, e2e tests and devtools UI — not
production runtime constants, but they still duplicate the URLs:

- Devtools selector list: [`EdgeSelector.tsx:15-18`](../../devtools/devtools/src/containers/EdgeSelector.tsx).
- CLI sample configs: `packages/devtools/cli/config/config-*.yml`.
- App manifests: `packages/apps/{todomvc,testbench-app,tasks}/dx.yml`.
- Stories/tests across `plugin-meeting`, `plugin-thread`, `plugin-bluesky`, `react-client`, `ai`, etc.
- CI env: `.github/workflows/env/{main,labs}`, `.github/workflows/{check,preview}.yml`.

---

## 3. `config.proto` field-usage audit (`Runtime.Services`)

Legend — **Status**: `live` = read in production TS; `config-only` = appears in
YAML/CLI but no TS reader; `dead` = no references outside the proto + generated
code.

| Field (`Runtime.Services.*`) | Status | Representative reader                                                                               | Recommendation                                     |
| ---------------------------- | ------ | --------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `edge`                       | live   | [`client.ts:162`](../../sdk/client/src/client/client.ts)                                            | keep (canonical edge endpoint)                     |
| `ai`                         | live   | [`GptRealtime.tsx:66`](../../ui/react-ui-canvas-compute/src/shapes/GptRealtime.tsx)                 | keep                                               |
| `hub`                        | live   | [`hub/util.ts:22`](../../devtools/cli/src/commands/hub/util.ts)                                     | keep; unify with `app.env.DX_HUB_URL` usage        |
| `ipfs`                       | live   | [`DebugSettings.tsx:56`](../../plugins/plugin-debug/src/components/DebugSettings/DebugSettings.tsx) | keep                                               |
| `signaling` (`repeated`)     | live   | [`service-host.ts:164`](../../sdk/client-services/src/packlets/services/service-host.ts)            | keep                                               |
| `ice` (`repeated`)           | live   | [`service-host.ts:154`](../../sdk/client-services/src/packlets/services/service-host.ts)            | keep                                               |
| `ice_providers` (`repeated`) | live   | [`service-host.ts:153`](../../sdk/client-services/src/packlets/services/service-host.ts)            | keep                                               |
| `agent_hosting`              | live   | [`AgentHostingProvider.tsx:25`](../../sdk/react-client/src/client/AgentHostingProvider.tsx)         | keep (already marked deprecated in proto — review) |
| `kube`                       | dead   | —                                                                                                   | **deprecate** (already commented Deprecated)       |
| `app` (AppServer)            | dead   | —                                                                                                   | **deprecate**                                      |
| `dxns`                       | dead   | —                                                                                                   | **deprecate**                                      |
| `machine`                    | dead   | —                                                                                                   | **deprecate**                                      |
| `bot`                        | dead   | —                                                                                                   | **deprecate**                                      |
| `publisher`                  | dead   | —                                                                                                   | **deprecate**                                      |
| `supervisor`                 | dead   | —                                                                                                   | **deprecate** (already commented Deprecated)       |
| `tunneling`                  | dead   | —                                                                                                   | **deprecate** (already commented Deprecated)       |
| `faasd`                      | dead   | —                                                                                                   | **deprecate** (already commented Deprecated)       |

### `Runtime.Client` fields

| Field                                | Status | Representative reader                                                                         | Recommendation |
| ------------------------------------ | ------ | --------------------------------------------------------------------------------------------- | -------------- |
| `remote_source`                      | live   | [`client-services-factory.tsx:68`](../../sdk/client/src/services/client-services-factory.tsx) | keep           |
| `remote_source_authentication_token` | live   | [`client-services-factory.tsx:76`](../../sdk/client/src/services/client-services-factory.tsx) | keep           |
| `devtools_proxy`                     | live   | [`service-host.ts:202`](../../sdk/client-services/src/packlets/services/service-host.ts)      | keep           |
| `disable_p2p_replication`            | live   | [`service-host.ts:210`](../../sdk/client-services/src/packlets/services/service-host.ts)      | keep           |
| `enable_vector_indexing`             | live   | [`service-host.ts:212`](../../sdk/client-services/src/packlets/services/service-host.ts)      | keep           |
| `enable_snapshots`                   | dead   | — (test/story stubs only)                                                                     | **deprecate**  |
| `snapshot_interval`                  | dead   | — (test/story stubs only)                                                                     | **deprecate**  |

> `space_fragmentation` (`Storage`) is already annotated `@deprecated`.

The top-level `Runtime.Kube` message (line 274) and `Config.kube` (line 501) are
the legacy KUBE deployment descriptor and have no TS readers — candidates for
wholesale deprecation, deferred to a later phase (large surface).

---

## 4. Hard-coded strings: cleanup targets

Production runtime constants to replace with config-resolved values (ordered by
blast radius):

| Constant                                         | File                                                                                                                          |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `CALLS_URL`                                      | [`plugin-calls/src/calls/types.ts:16`](../../plugins/plugin-calls/src/calls/types.ts)                                         |
| `DEFAULT_TRANSCRIPTION_URL`                      | [`plugin-transcription/src/transcriber/transcriber.ts:19`](../../plugins/plugin-transcription/src/transcriber/transcriber.ts) |
| `DEFAULT_IMAGE_SERVICE_URL` (×2)                 | `plugin-crm/.../attach-image.ts:22`, `plugin-support/.../screenshot.ts:28`                                                    |
| `DISCORD_SERVICE_URL`                            | [`plugin-support/src/constants.ts:11`](../../plugins/plugin-support/src/constants.ts)                                         |
| `LEGACY_CORS_PROXY_URL`                          | [`edge-client/src/cors-proxy.ts:9`](../../core/mesh/edge-client/src/cors-proxy.ts)                                            |
| `MCP_SERVER_URL` / `INTROSPECT_MCP_URL`          | `plugin-debug/.../react-surface.tsx:64`, `plugin-code/src/blueprints/coder.ts:34`                                             |
| `MAIN_CHAT_AGENT_URL` / `MAIN_IMAGE_SERVICE_URL` | [`composer-crx/src/config.ts`](../../apps/composer-crx/src/config.ts)                                                         |
| api-proxy discord baseUrl                        | [`fetch-messages.ts:32`](../../core/compute/assistant-toolkit/src/blueprints/discord/operations/fetch-messages.ts)            |

Target end-state:

- Canonical defaults (test/dev) live in `@dxos/config` (importable, single
  source of truth).
- Production values live in `composer-app/dx.yml` (+ `dx-env.yml` for env
  overrides).
- Plugins read the endpoint from `client.config` rather than embedding a literal.

---

## 5. Proposed abstraction: a service list

Rather than adding one typed message per new worker (the pattern that produced
`calls`, `image`, `discord`, … sprawl), introduce a keyed list of service
descriptors. Each entry has a canonical `name`, an `endpoint`, plus optional
service-specific `props`.

> A proto `map<string, EdgeService>` would be the natural shape, but the
> `@dxos/effect-proto` schema layer rejects map fields
> (`effect-proto: map fields are not supported`). A `repeated` message keyed by
> `name` is the supported equivalent.

```proto
message Runtime {
  message Services {
    // Canonical descriptor for an EDGE (Cloudflare Worker) service.
    message EdgeService {
      // Canonical service name (e.g. "ai", "image", "calls"). Unique within edge_services.
      optional string name = 1;
      // Service endpoint (http(s)/ws(s) URL).
      optional string endpoint = 2;
      // Optional service-specific properties (e.g. provider path, auth scheme, region).
      optional google.protobuf.Struct props = 3;
    }

    // EDGE service configurations keyed by EdgeService.name.
    repeated EdgeService edge_services = 18;

    // ... existing typed fields retained for migration ...
  }
}
```

`@dxos/config` then owns the canonical key set and the test/dev defaults
([`edge-services.ts`](src/edge-services.ts)):

```ts
// @dxos/config — canonical service names + dev defaults.
export const EdgeServiceName = {
  Calls: 'calls',
  Image: 'image',
  Transcription: 'transcription',
  Discord: 'discord',
  CorsProxy: 'cors-proxy',
  ApiProxy: 'api-proxy',
  Introspect: 'introspect',
  ChatAgent: 'chat-agent',
} as const;
```

Trade-off considered (recorded for the reviewer):

1. **Keyed `repeated` + `Struct` props (chosen).** One additive field; new
   services need no proto change; `@dxos/config` owns naming. Cost: props are
   untyped (`Struct`), validated at the reader; lookup is a `.find` by `name`.
2. **One typed message per service.** Strong typing, but every new worker is a
   proto change + regen + new accessor — the status quo that caused the sprawl.

Chosen: **(1)** for the URL-only workers (calls, image, discord, transcription,
cors-proxy, introspect, api-proxy, chat-agent); keep the existing typed messages
for the structurally-rich, load-bearing services (`edge`, `ai`, `ipfs`, `ice`,
`signaling`) since they have non-URL fields and many readers.

---

## 6. Cleanup plan

**Phase 1 (this change) — consolidate definitions, deprecate dead fields.**

- Annotate dead `Services`/`Client` fields with `[deprecated = true]` + comment.
- Add the `EdgeService` message + keyed `edge_services` list to `config.proto`.
- Regenerate `@dxos/protocols`; build to verify.
- Add canonical service-name constants + dev defaults to `@dxos/config`.

**Phase 2 — migrate hard-coded URLs to config. (in progress)**

Canonical names + dev defaults now live in
[`@dxos/config` `edge-services.ts`](src/edge-services.ts) (`EdgeServiceName`,
`EDGE_SERVICE_DEFAULTS`, `getEdgeServiceEndpoint`). Production values are set in
[`composer-app/dx.yml`](../../apps/composer-app/dx.yml)
(`runtime.services.edgeServices`).

Migrated (literal removed; resolves from config / canonical default):

| Service       | Site                                                                                | How                                 |
| ------------- | ----------------------------------------------------------------------------------- | ----------------------------------- |
| calls         | `plugin-calls` `call-manager.ts`                                                    | `getEdgeServiceEndpoint(config, …)` |
| transcription | `plugin-transcription` `transcriber.ts`                                             | `EDGE_SERVICE_DEFAULTS` fallback    |
| image         | `plugin-crm` `attach-image.ts`, `plugin-support` `screenshot.ts`/`GitHubAction.tsx` | default + config read               |
| discord       | `plugin-support` `DiscordAction.tsx`/`constants.ts`                                 | `getEdgeServiceEndpoint(config, …)` |
| introspect    | `plugin-debug` `react-surface.tsx`                                                  | `EDGE_SERVICE_DEFAULTS` fallback    |

Deferred (literal retained; rationale):

| Service / site                                             | Why deferred                                                        |
| ---------------------------------------------------------- | ------------------------------------------------------------------- |
| cors-proxy — `edge-client/cors-proxy.ts`                   | low-level core/mesh; avoid heavy `@dxos/config` dep (legacy proxy). |
| chat-agent, image — `composer-crx/config.ts`               | separate extension app; its `MAIN_*` constants are its prod values. |
| api-proxy, playwright-mcp — `assistant-toolkit` blueprints | function-runtime blueprints; no client config in scope.             |
| introspect — `plugin-code/coder.ts` blueprint              | function-runtime blueprint; needs config plumbing.                  |

Remaining: collapse `defaultConfig` / `configPreset` / `dx.yml` `edge`/`ai`
duplication to one source; migrate the deferred sites once config access exists.

**Phase 3 — remove legacy KUBE + fully-deprecated messages.**

- Once no consumers remain, delete the dead `Services` sub-messages and the
  top-level `Kube` config.

---

## Appendix: methodology

- Hard-coded hosts: `rg '\.dxos\.workers\.dev'` (and `dxos.network`/`dxos.org`),
  excluding `dist/`, `node_modules/`, `*.min.*`.
- Field usage: `rg` for `runtime.services.<field>` / `services?.<field>` reader
  patterns across `*.ts`/`*.tsx`, excluding tests/stories where noted.
- Cites are `file:line` at audit time (commit on branch
  `claude/intelligent-stonebraker-bf7972`).
