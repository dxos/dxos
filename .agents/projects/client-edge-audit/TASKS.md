# Client–Edge Audit — Tasks

_Resume: PR #12598 open — drive review + Check to green and land it, then pick up Phase 4 follow-ups. Uncommitted: none expected._

## Phase 1: Inventory client→edge communication points

Map every place the client stack talks to edge — `EdgeHttpClient`, `EdgeClient`
(websocket), and ad-hoc `fetch`/`WebSocket` calls — so offline behavior and
defaults can be audited against a complete list. Findings live in DESIGN.md.

### Tasks

- [x] **Inventory `EdgeHttpClient` / `EdgeClient` constructions and consumers** —
      DESIGN.md §Edge client constructions. Boot path fully URL-gated; three
      inconsistent absent-URL policies (skip / throw-on-use / invariant).
- [x] **Inventory direct `fetch`/`WebSocket`/other network calls in the client stack** —
      DESIGN.md §Direct network call sites. Client stack: zero calls without
      edge URL; observability has 3 open consent-gating issues (ipdata
      pre-`disabled` ordering, OtelMetrics constructor-started exporter,
      `posthog.init` ignoring `disabled`), plus a missing-key boot warn.
- [x] **Inventory config plumbing for the edge endpoint** —
      DESIGN.md §Config plumbing & defaults. SDK boot is clean; violations were
      in @dxos/config (defaultConfig, configPreset, EDGE_SERVICE_DEFAULTS) +
      scattered `??` fallbacks.

## Phase 2: Offline config works cleanly

With no edge endpoint in config: database works, zero network activity, zero
warnings/errors.

### Tasks

- [x] **Determine current offline behavior** — SDK boot is already silent and
      clean (every edge site gated; signaling falls back to memory; the P2P
      note logs at debug). App-level noise: ipdata missing-key boot warn and
      the module-loader capability warn (both Phase 4).
- [x] **Add an automated offline test** —
      [client-offline.test.ts](../../../packages/sdk/client/src/client/client-offline.test.ts):
      empty `Config()`, identity + space + object round-trip, `fetch`/
      `WebSocket`/isomorphic-ws intercepted, all WARN+ log entries captured;
      asserts zero network calls and zero warnings. Green.
- [x] **Fix each offending site** — SDK boot path had none; the app-level items
      are Phase 4 follow-ups.

## Phase 3: No edge-endpoint defaults

### Tasks

- [x] **Find any code/config default that injects an edge endpoint** — full
      list in DESIGN.md §Config plumbing & defaults.
- [x] **Remove them** — shipped in this branch:
  - `@dxos/config`: `defaultConfig` DELETED; `ConfigService.load` writes
    `defaultProfileEndpoints` (hub, edge, ICE, IPFS) into the profile it creates
    (under `DX_LOCAL_DEV` — monorepo `bin/dx` only — `localDevConfig` from PR
    #12658 forks the written edge URL to `main.dxos.network`, layered over the
    same endpoint set)
    and merges `profileBuiltinDefaults` — features and storage only — on both
    load branches (fixing the first-run branch that skipped the merge). Endpoints
    live in the user's file; no code path substitutes them on load.
    `EDGE_SERVICE_DEFAULTS` deleted, `getEdgeServiceEndpoint` returns
    `string | undefined`. Pinned by `no-default-endpoints.test.ts`.
    `configPreset` keeps its `edge = 'main'` default by decision — the factory
    call is itself an explicit opt-in.
  - Consumers updated to handle absence: pipeline-transcription `Transcriber`
    (clear error; endpoint now threaded from config via plugin-transcription),
    plugin-crm `attach-image` (typed error), plugin-support screenshot upload
    (skip + debug log), plugin-calls `join()` (invariant), plugin-devtools
    ToolsExplorer (new config-driven container).
  - `react-ui-introspect`: `DEFAULT_INTROSPECT_MCP_URL` removed; explorer
    renders a "not configured" state.
  - CLI hub commands: `?? 'https://hub.dxos.network'` (×2) → `hubBaseUrl` fails
    with `HubApiError` when `runtime.services.hub.url` is unset. Briefly reverted
    on merge with PR #12642, reinstated by decision 2026-08-18 — the created
    profile carries the URL, so its absence is a real condition to report.
  - `sdk/client` devtools hook: no more `https://halo.dxos.org` fallback target.
  - `client-protocol`: deprecated `DEFAULT_VAULT_URL` deleted (zero readers).
  - `edge-client/service/Image.ts`: `DEFAULT_IMAGE_SERVICE_URL` export deleted
    (tests inlined their own fixture URLs).
  - GptRealtime shape + plugin-wnfs: `localhost:8787` fallbacks removed
    (error / contribute-nothing respectively).
  - composer-app `dx.yml`: gained the `introspect` edgeServices entry so
    Composer keeps its behavior via app config (the acceptable channel).

## Live QA against the deployed preview (2026-08-27)

Driven headless against `pr-12598-composer-dev.dxos.workers.dev` (head `87c2d21461`, EDGE preview)
from the cloud sandbox. Boot, identity auto-create, default+exemplar spaces, document create /
flush / reload-persistence, and EDGE replication (wss to `preview.dxos.network`, frames both ways)
all work out of the box; zero `module did not contribute` warnings with the full config; Discord
`/presence` 200 and the cors-proxy relay work from the app origin. Environment defects found, none
in this PR's code:

- [ ] **image.dxos.network CORS excludes preview origins** — preflight echoes no
      `access-control-allow-origin` for `*.dxos.workers.dev` (composer.space is allowed), so
      screenshot upload and CRM image re-host fail by CORS on every PR preview. The worker itself
      is alive (`POST /upload` answers). Edge-repo allowlist fix.
- [ ] **introspect.dxos.network/mcp 403s every request carrying an `Origin` header** — even
      `https://composer.space` — while its CORS preflight approves the same origin; a plain curl
      (no Origin) gets a 200 MCP initialize. Browser MCP clients therefore can never connect, so
      ToolsExplorer renders its connection-error state on every deployed origin. Likely the MCP
      server's DNS-rebinding/origin protection with an empty allowlist. Edge-repo fix.
- [ ] **Fresh anonymous boot logs an operation failure** — `client.createAgent` auto-invokes and
      fails `Identity is not associated with an account` (plus a 401 resource load) on every new
      profile; pre-existing, but it is the loudest console error a new user sees.
- Untestable from the sandbox (egress blocks calls.dxos.network, UDP/TURN): live calls,
  transcription audio, multi-device invitation. Calls/meeting/transcription/CRM plugins are
  default-disabled, so their absent-endpoint gating states do not arise out of the box.

## Phase 4: Follow-ups (recorded, not started)

- [ ] **Route `proxyFetchLegacy` through config** — `cors-proxy.ts:9` hard-codes
      `https://cors.dxos.network`; ~13 plugins + `edge-http-client.ts:592` +
      assistant-toolkit websearch/discord call it with no config. Marked
      TEMPORARY in-source pending an authenticated `/proxy/*` route; plumb
      `getEdgeServiceEndpoint(config, CorsProxy)` through.
- [ ] **Make capability opt-out warning-free** — `module-loader.ts:497` warns
      "module did not contribute all declared capabilities" for modules that
      legitimately return `[]` on absent config (plugin-file edge backend,
      plugin-client hub, now plugin-wnfs blockstore). Needs first-class
      optional contributions so offline Composer boot logs nothing.
- [ ] **Observability consent gating** — ipdata provider runs before the
      `disabled` check; `OtelMetrics` starts its 60s exporter in the
      constructor bypassing `if (disabled)`; `posthog.init` fires regardless of
      `disabled` (only autocapture is suppressed).
- [ ] **ipdata missing-key boot warn** — `ip-data.ts` `log.warn`s on every boot
      when `DX_IPDATA_API_KEY` is absent, which is a normal configuration. A
      downgrade to debug was reverted out of this branch by request, so it stays
      open here.
- [ ] **plugin-script `?? ''` masking** — hooks/deploy.ts:128,
      skills/functions/deploy.ts:71, FunctionBinding.tsx:30 substitute empty
      string for a missing edge URL; surface absence instead.
- [ ] **`memoryConfig` edgeFeatures all-true with no endpoint**
      (config-service.ts) — inert but contradicts offline-first; decide.
- [ ] **Publish hygiene** — react-client + examples lack a `files:` allowlist
      so legacy dx.yml (kube signaling, no edge) ships to npm.
- [ ] **react-edge-client is dead weight** — `useEdgeClient` has zero call
      sites; only a type import in plugin-transcription keeps the package
      alive. Consolidate into `client.edge` and remove.
- [ ] **Remaining feature-time literals (outside client stack)** — plugin-code
      `INTROSPECT_MCP_URL` (Coder skill MCP server; config-wiring was attempted
      in PR #12598 and deliberately reverted to keep the PR client-scoped — a
      skill `Definition.make` is nullary, so config injection needs the
      capability-wrapper seam), plugin-video `TRANSCRIPTION_ENDPOINT` (has
      TODO), plugin-client `ACCOUNT_PROFILE_URL`, plugin-script
      `hub.dxos.network` serverName, assistant-toolkit discord cors URL +
      browser-skill playwright-mcp URL, composer-crx literals, agent-hosting
      `localhost:8082` (invariant-gated).
- [ ] **Document the devtools EdgeSelector override channel** — writes
      `org.dxos.settings.config` to localforage, which Composer's `setupConfig`
      reads first; invisible to users.

Deliberately kept (explicit user choices, not silent fallbacks): `dx profile
create` environment templates; `dx … share --host https://composer.space`
option defaults; test-only literals (mock URLs, the env-gated image-service
e2e).

### References

- DESIGN.md (this directory) — audit findings + decisions.
- REPORT.md (this directory) — session write-up.
- PR #12585 — defer edge networking until the worker has booted (prior art).
