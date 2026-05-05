# Agentic Coding on Cloudflare

Status: Draft
Author: Claude (with Rich Burdon)
Date: 2026-05-04

## Goals

- Let plugin authors create Composer plugins via natural-language chat in `plugin-code`.
- Compile, test, and serve those plugins entirely on Cloudflare infrastructure (the EDGE monorepo).
- Reuse our existing assistant / blueprint / operation stack rather than build a parallel agent runtime.
- Keep a clean Git story so plugins remain portable and reviewable.

## Non-goals

- Replacing local-dev for power users — this targets in-Composer authoring.
- Multi-language support — TypeScript only initially.
- A general-purpose hosted code runtime — this serves plugins, not arbitrary user code.

## Existing components

- **`plugin-code`** — Composer plugin where users write/modify other Composer plugins. Owns the chat, file UI, preview surface, and ECHO-backed source tree.
- **`@dxos/introspect` + `introspect-mcp`** — Indexes DXOS / Composer APIs and exposes them as an MCP server for code-aware LLMs.
- **`@dxos/assistant` + `plugin-assistant`** — Provides agents via the AI Service. Already supports blueprints (recipe definitions) and operations (tools the LLM can call). Recently hardened against MCP server failures (#11226).
- **EDGE** — Separate monorepo of Cloudflare-based services. Already hosts the AI Service.

## Architecture overview

```text
┌────────────────── Composer (browser) ──────────────────┐
│  plugin-code  ──chat──▶  plugin-assistant              │
│       │                       │                        │
│       └── ECHO source space ──┘                        │
└──────────────────────┬─────────────────────────────────┘
                       │ AI Service (blueprints / operations / MCP)
                       ▼
┌────────────────── EDGE (Cloudflare) ───────────────────┐
│  AI Service                                            │
│   ├── plugin-developer blueprint                       │
│   ├── code.* operations  ◀── thin RPC ──┐              │
│   └── introspect-mcp (remote MCP)        │              │
│                                          ▼              │
│  Code Sandbox Service       (Containers + per-project DO)│
│       │                                                 │
│       │ build artifacts                                 │
│       ▼                                                 │
│  Plugin Registry            (D1 metadata + R2 bundles)  │
│       │                                                 │
│       ▼                                                 │
│  Plugin Dispatcher          (Workers for Platforms)     │
│                                                         │
│  Source Sync                (GitHub App; optional)      │
└────────────────────────────────────────────────────────┘
```

## Q1. Can we extend the existing AI Service via blueprints / operations?

**Yes — this is the right shape.** The blueprint/operation/MCP model already covers what we need; agentic coding is a domain blueprint, not a new runtime.

### `plugin-developer` blueprint

Lives alongside other coding-focused blueprints (likely `@dxos/assistant-coding` or as a coding bundle inside `@dxos/assistant`). It defines:

- **System prompt** scoped to plugin authoring — covers `PLUGIN.mdl` conventions, capability/surface patterns, the import rules in `CLAUDE.md`, and the React conventions that already live in `.agents/sdk/`.
- **Required tools** — the `code.*` operations below, plus `introspect-mcp` attached as a remote MCP server. The agent calls introspect tools **directly via MCP** — there is no `code.search_api` proxy. MCP gives us streaming, schema-typed tools, and graceful degradation (#11226) for free; a hand-written wrapper would just add a translation layer with nothing to translate. The trade-off is that introspect's tool surface becomes part of the agent's tool budget; we mitigate by keeping its tool count small and well-named.
- **Default model selection** — Sonnet 4.6+ for the inner edit loop, Opus for plan/scaffold turns where reasoning depth pays off.

### `code.*` operations

Operations that the agent can invoke as tools. All take a `project_id` from blueprint context; all are HALO-authenticated.

| Operation                         | Purpose                                                                                                                              |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `code.scaffold(template, name)`   | Provision a sandbox + write initial files from template                                                                              |
| `code.list_files(path)`           | Directory listing                                                                                                                    |
| `code.read_file(path)`            | Read file contents                                                                                                                   |
| `code.write_file(path, contents)` | Whole-file write (rare; prefer patch)                                                                                                |
| `code.apply_patch(unified_diff)`  | Apply a unified diff to the sandbox FS                                                                                               |
| `code.search_source(query)`       | ripgrep across the project                                                                                                           |
| `code.compile()`                  | Run typecheck + bundle; returns diagnostics + bundle hash                                                                            |
| `code.test(filter?)`              | Run vitest; returns pass/fail + failure output                                                                                       |
| `code.deploy(target)`             | Phase 1: returns signed bundle download. Phase 2+: publishes to dispatcher and returns deployment URL. `target ∈ {preview, release}` |
| `code.preview_url()`              | Resolve the live URL for the latest preview deploy (Phase 2+)                                                                        |

DXOS/Composer API lookup is **not** in this list — that surface is provided by introspect-mcp's own tools (e.g. `search_symbols`, `get_symbol_docs`), which the blueprint exposes directly to the agent.

Compile / test / deploy are long-running and **must stream**. We model them as operations that return a job handle, and provide a streaming subscription so chat surfaces progress live (build logs, test failures) rather than blocking until completion.

### Why blueprints/operations is enough

- **No new agent loop.** The same orchestrator that runs other DXOS agents drives the coding agent.
- **Composability.** Future blueprints (e.g. `migrate-plugin-to-v2`, `port-plugin-to-mobile`) reuse the same operations.
- **Observability.** Existing tracing / @dxos/log integration applies for free.

## Q2. What new EDGE services do we need?

Four. Each is described as a focused service spec — small enough that the team could implement them in parallel after Phase 1 lands.

---

### 2.1 Code Sandbox Service (`cf-code-sandbox`)

**Purpose:** Per-project ephemeral filesystem + toolchain (pnpm, tsc, esbuild, vitest).

**Implementation:**

- **Cloudflare Containers** running a thin sidecar that exposes an HTTP API (read/write/list/exec).
- **One container per active project**, fronted by a **Durable Object** that serializes commands, streams logs, and persists FS to R2 between sessions.

**Why containers, not Workers?** tsc + pnpm + vitest in worker isolates is a fight not worth having. Containers run the standard Node toolchain unmodified and let us reuse the same Dockerfile we use locally. The Cloudflare Sandbox SDK is worth a spike — it may obviate parts of the DO+Container coordinator we'd otherwise hand-roll.

**Lifecycle:**

1. **Cold start** — DO pulls last FS snapshot from R2 → boots container → restores tree.
2. **Warm** — requests routed to running container.
3. **Idle 15min** — snapshot to R2, stop container, free quota.

**API** (HALO-authenticated; `project_id` derived from token claims):

```http
POST /sandbox/:project_id/files         { path, contents }
GET  /sandbox/:project_id/files/:path
POST /sandbox/:project_id/patch         { unified_diff }
POST /sandbox/:project_id/exec          { argv, env, timeout } → SSE stream
POST /sandbox/:project_id/snapshot
DELETE /sandbox/:project_id
```

**Resource model:**

- Per-user concurrent-sandbox cap (e.g. 3).
- Per-sandbox CPU + memory cap.
- Outbound network: deny by default; allow-list npm registry (cached through an R2-backed mirror to keep cold starts cheap).

---

### 2.2 Plugin Registry (`cf-plugin-registry`)

**Purpose:** Source of truth for plugin metadata and compiled artifacts.

**Schema** (D1):

```sql
plugins (
  id            TEXT PRIMARY KEY,
  owner_did     TEXT NOT NULL,
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  visibility    TEXT NOT NULL,  -- private | unlisted | public
  created_at    TIMESTAMP
);

plugin_versions (
  id            TEXT PRIMARY KEY,
  plugin_id     TEXT NOT NULL REFERENCES plugins(id),
  version       TEXT NOT NULL,        -- semver
  bundle_hash   TEXT NOT NULL,
  source_commit TEXT,                  -- ECHO commit hash or git sha
  created_at    TIMESTAMP
);

plugin_deployments (
  plugin_id     TEXT NOT NULL,
  env           TEXT NOT NULL,         -- preview | prod
  version_id    TEXT NOT NULL,
  dispatcher_script TEXT NOT NULL,     -- script name in WfP namespace
  deployed_at   TIMESTAMP,
  PRIMARY KEY (plugin_id, env)
);
```

**Artifacts** (R2):

```text
plugins/{id}/{version}/bundle.js
plugins/{id}/{version}/source.tar.zst
plugins/{id}/{version}/sourcemap.json
plugins/{id}/{version}/manifest.json
```

**API:** standard CRUD + signed-URL upload — the sandbox uploads bundles directly to R2; the registry writes the metadata row on PUT-complete.

**Bundle signing:** the registry signs each bundle with a per-environment key. The dispatcher verifies the signature before serving. This protects against R2 tampering and lets us revoke a bad bundle by burning the key.

---

### 2.3 Plugin Dispatcher (`cf-plugin-dispatcher`)

**Purpose:** Serve compiled plugins as live workers.

**Implementation:** **Workers for Platforms** dispatch namespace.

- Each plugin deployment uploads its bundle as a script to the namespace, named `<plugin-id>--<env>`.
- A dispatcher worker resolves `/p/:plugin_id/*` → `namespace.get(<plugin-id>--prod)`.
- Per-plugin bindings (KV namespace, R2 bucket scoped to the plugin, queues) are provisioned at deploy time, declared in the plugin manifest.
- Secrets are stored in a Workers Secrets Store and referenced from the plugin script.

**Why Workers for Platforms:** this is the same primitive Cloudflare uses to host SaaS-customer code. It gives us script isolation, per-tenant outbound limits, and a clean namespace per environment without us writing our own multi-tenant runtime.

**Quotas:**

- CPU time per request, sub-request count, and total request count enforced at the namespace level.
- Per-plugin request budget surfaced back to the author in plugin-code.

---

### 2.4 Source Sync Service (`cf-source-sync`)

**Purpose:** Two-way sync between an ECHO source space and a GitHub repo.

**Implementation:**

- **GitHub App** installed on the user's repo grants commit + push.
- **Worker + Durable Object** per `(plugin, repo)` binding.
- Webhook receives upstream pushes → applies as a commit to the ECHO source space (using the same diff/patch path the agent uses for `code.apply_patch`).
- ECHO mutations are debounced and pushed as squashed commits, with a message synthesized from the assistant turn(s) that produced them.
- Conflicts surface as a `rebase needed` state in `plugin-code`; user resolves the conflict in chat with assistance.

This is **optional**: a plugin can live entirely in ECHO. Source Sync gives developers a Git history, code review, and an exit ramp — without making GitHub mandatory.

---

## Q3. How do we do source code management?

**Recommendation: ECHO is source of truth; GitHub is an optional mirror.**

### Why ECHO-first

- **Realtime collab + undo + ACLs already exist** in ECHO. Reinventing them on GitHub is a tax for no benefit.
- **The agent can subscribe to file changes** and re-run impacted tests / introspect lookups reactively — hard to do over a GitHub-only model.
- **Multi-author authoring** (a designer and an engineer pairing in plugin-code) just works.

### Why not ECHO-only

- Developers expect a Git history and the ability to take their plugin elsewhere.
- Code review (PRs, line comments) is a solved problem on GitHub; we shouldn't rebuild it.
- External contribution from outside Composer needs a Git surface.

### ECHO schema

```ts
class SourceFile {
  path: string; // "src/plugin.ts"
  content: string;
  encoding: 'utf8' | 'base64';
  mode: number; // POSIX file mode
}

class SourceTree {
  root: Ref<SourceFile>[];
}

class PluginProject {
  source: Ref<SourceTree>;
  buildConfig: BuildConfig;
  registryPluginId?: string; // set after first deploy
  githubBinding?: Ref<GithubBinding>; // set if Source Sync is enabled
}
```

### Authoring flow

1. User opens `plugin-code` → creates new project → ECHO `PluginProject` is created in the user's space.
2. Sandbox materializes from `SourceTree` on first compile; subsequent compiles diff against the in-memory tree.
3. On deploy, sandbox uploads bundle to registry; registry tags the deployment with the current ECHO commit hash (synthesized from object hashes).
4. Optional: user enables GitHub sync — Source Sync DO handles the rest.

## End-to-end flow

> User in `plugin-code`: _"Add a panel that lists all unread Slack threads."_

1. `plugin-assistant` invokes `plugin-developer` blueprint with project context (current `PluginProject`, recent file edits).
2. Agent calls `code.search_api("Slack")` → introspect returns no results.
3. Agent calls `code.search_api("MCP server")` → introspect returns plugin-mcp examples.
4. Agent proposes a plan in chat → user approves.
5. Agent calls `code.read_file("src/plugin.ts")`, then `code.apply_patch(...)` to add the panel.
6. Agent calls `code.compile()` → diagnostics streamed → 1 type error.
7. Agent reads the relevant file, patches, retries → green.
8. Agent calls `code.test()` → green.
9. Agent calls `code.deploy('preview')` → returns preview URL.
10. `plugin-code` surfaces an iframe-mounted preview of the deployed plugin running in the dispatcher.

## Security model

- **All EDGE APIs HALO-authenticated.** `project_id` and `owner_did` asserted from signed token claims, not request body.
- **Sandbox container** runs as unprivileged user, no outbound internet by default (npm allow-listed via R2 mirror).
- **User-deployed plugins** run in the dispatcher namespace with **no DXOS credentials by default**; opt-in to specific bindings via the plugin manifest.
- **Bundle signing** + dispatcher verification protects against tampered R2 artifacts; key rotation revokes a bad bundle.
- **Quota fences** at the dispatcher level prevent a single plugin from starving others.

## Phasing

| Phase | Scope                                                                | Deliverable                                                                           |
| ----- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| **1** | Sandbox service + `code.*` operations + `plugin-developer` blueprint | Author-from-chat works; `code.deploy` returns a signed zip download (no live serving) |
| **2** | Plugin Registry + Plugin Dispatcher                                  | Live preview URLs; one-click publish                                                  |
| **3** | Source Sync (GitHub App)                                             | Two-way GitHub sync; PR workflow                                                      |
| **4** | Multi-author collab, marketplace, billing                            | Public plugin distribution                                                            |

## Open questions

1. **Sandbox SDK vs. own coordinator** — does Cloudflare's Sandbox SDK obviate the per-project DO+Container coordinator? Worth a spike before Phase 1 lands.
2. **npm strategy** — proxy through R2 cache, or rely on upstream registry? Cold-start latency matters and a cache buys a lot.
3. **ECHO state in tests** — plugins that depend on ECHO state need a test substrate. Synthetic spaces in the sandbox? A thin "ECHO emulator" worker? This intersects with `agent-e2e-tests` / `testing-assistant-conversations` work.
4. **Introspect versioning** — do introspect indices need to be sharded per Composer release? Plugin authors targeting an older Composer should get matching APIs, not HEAD.
5. **Dispatcher isolation model** — per-user dispatcher namespaces (stronger isolation, more bindings to manage) or one shared namespace with per-plugin bindings (cheaper)? Default to shared; per-user as an enterprise tier.
6. **Streaming operation results** — current operation framework returns single values. Streaming compile/test output cleanly may need an extension to operations or a sidecar pubsub channel surfaced through the chat UI.
