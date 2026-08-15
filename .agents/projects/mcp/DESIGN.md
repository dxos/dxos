# mcp — Design

Companion to [TASKS.md](./TASKS.md). The loop design (Claude ⇔ MCP ⇔ EDGE ⇔ Composer) lives in
[agents/superpowers/specs/2026-07-31-local-edge-mcp-composer-roundtrip-design.md](../../../agents/superpowers/specs/2026-07-31-local-edge-mcp-composer-roundtrip-design.md);
the tool-surface work-stream is the edge repo's `mcp-operations` project. This file holds the
dxos-side decisions those two don't cover.

## 1. Two hosts, one surface

`@dxos/mcp-server` owns everything that decides what a model sees: annotated operations as tools,
opted-in skills as prompts, `skillLoad`, name derivation and the collision contract, ref widening,
the wire response passes, and the stdio transport that applies them. A host supplies a `Gateway`
— reach the registry, invoke an operation, name the session's spaces — and nothing else.

Two hosts consume it: edge's `mcp-space-service` (OAuth, grants, service bindings, trace feed) and
`dx mcp serve` (stdio, local client, no auth by design — OAuth is host-layer and host-layer is what
the local twin replaces). The fidelity contract: deltas are host-layer only. Anything that changes
the tool list, descriptions, schemas, prompts or `skillLoad` output lives in the package, or it is a
bug. A CI test running one registry fixture through both hosts is what will enforce this
(TASKS.md M6); today it is a convention.

### 1.1 What the contract does not yet cover

Two things a model sees are still decided per host, and both are duplication rather than genuine
host-layer difference:

- **The static toolkits.** `whoami`, `listSpaces`, the object CRUD and the discovery tools have no
  operation behind them, so each host hand-writes a toolkit. They are copies (the CLI's were ported
  from edge's), which means a change to any of their shapes has to be made twice and nothing
  detects a miss — which is exactly what happened: the CLI gained safety annotations and edge went
  on advertising every one of its reads as destructive until someone diffed the two.

  The duplication is not evenly spread, and that decides the cheapest fix. The **descriptors** —
  name, description, parameter and result schemas, annotations — are byte-identical between the two
  hosts. The **handlers** are not, and legitimately so: object CRUD differs only in the invoke seam
  (service binding vs in-process) and is ~95% the same code, but `space-tools` fans out three RPCs
  with a concurrency cap on edge where the CLI reads synchronously off a live client, and
  `discovery-tools` reads operation-service where the CLI reads the capability manager.

  So there are two routes, and the first does not block on the second. **Share the descriptors,
  keep per-host handlers**: it deletes every copy that exists today and makes an unannotated tool
  impossible, without waiting on any operations work. **Then** contribute them as annotated
  operations from a plugin, the route the project and task verbs already take, which removes the
  hand-written handlers too.

- **Space visibility.** Both hosts implement "never surface the HALO space or the settings space as
  a target", and neither shares an implementation: the CLI filters `client.spaces` through
  `AppSpace.isVisibleSpace` (which reads space tags), while edge re-declares `SETTINGS_SPACE_TAG`
  and pairs it with `withoutHaloSpace` / `withinSessionContext` over the grant's space ids. The
  inputs differ — a live client versus an OAuth grant — but the _rule_ should not, and today adding
  an internal tag would fix one host and quietly miss the other.

## 2. Third-party plugins in the CLI (2026-08-14)

**Goal.** A shipped `dx` binary loads plugins that were not compiled into it, and those plugins'
operations and skills appear on the MCP surface. The MCP half needs no work: `dx mcp serve`'s
gateway reads `Capabilities.OperationHandler` and `AppCapabilities.SkillDefinition` off the
capability manager, so any enabled plugin projects automatically.

**The browser already has the whole system**, and it is the model to follow rather than reinvent:

| Piece        | Browser                                                                                                                                                               |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Manifest     | `core/plugin-manifest.ts` — `manifest.json` beside the entry module; `devEntry` marks a Vite dev-server manifest (port 3967)                                          |
| Loader       | `core/url-loader.ts` — install/uninstall by URL, offline asset cache, version tags; `PluginManager.add(url)` imports and registers                                    |
| Shared scope | `vite-plugin/packages.ts` `DEFAULT_PACKAGES` — one source of truth; `importMapPlugin` serves one copy, `composerPlugin` externalizes the same set from plugin bundles |
| Distribution | `dx registry publish`, `EdgeRegistryPluginProvider` over edge's registry-service                                                                                      |
| Dev loop     | `devPluginUrl` / `devPluginEnabled` settings + `capabilities/dev-plugin-loader.ts`                                                                                    |

`@dxos/plugin-*` is deliberately **not** in the shared set — community plugins bundle their own copy
of any plugin-subpath import, which is safe because those exports are types and operation
definitions.

### 2.1 The node/bun half

Measured on bun 1.3.11, in a compiled single-file executable (the shape `dx` ships as):

1. A compiled binary **can** dynamically `import()` an on-disk ESM file at runtime. No flags.
2. A bare specifier inside that plugin resolves to **the plugin's own copy** — host and plugin each
   saw their own instance of a stateful module. This is the failure mode that silently breaks
   ECHO's schema registry, the capability system and effect service identity. With no copy on disk
   it does not fall back to the binary; it fails with `Cannot find package`.
3. `Bun.plugin({ setup })` with `build.module(specifier, () => ({ exports, loader: 'object' }))`
   **fixes it inside the compiled binary**: the plugin's imports resolve to the host's already-loaded
   instances, and it **takes precedence over a copy installed in the plugin's own `node_modules`**,
   so authors can install deps for typechecking without risking a duplicate at runtime.

So bun's runtime module registry is the node-side analogue of the browser's import map, and
`DEFAULT_PACKAGES` stays the one contract both hosts honor.

### 2.2 What the CLI needs

- `dx plugin add <url|name>` — fetch manifest, download assets under `~/.config/dx/plugins/<id>/`,
  import, validate `meta`, register. `dx plugin enable/disable/list` already exist but resolve only
  against compiled-in plugins (`enable.ts` fails when the id is not in `manager.getPlugins()`).
- Persistence for installed remotes. `plugins/<profile>.yml` records enabled ids today; the
  installed-remote records (`RemotePluginView`: id, url, version) live in `localStorage` in the
  browser and need a file-backed equivalent.
- A shared-scope registration at startup — `Bun.plugin` over `DEFAULT_PACKAGES`, generated from the
  same list the Vite plugin reads.

### 2.3 Installed vs enabled

Yes, they are different, and the CLI is where the difference starts to carry weight. `PluginManager`
has had both axes since it was written — `add`/`remove` register and unregister a plugin,
`enable`/`disable` turn a registered one on, and `add`'s contract is explicitly "registers it
**without enabling it**". What the CLI lacks is a second axis worth showing: its installed set is the
compile-time constant `getPlugins()` in `commands/plugin-defs.ts`, so "installed" is true of
everything and carries no information. That is why `plugin/list.ts` renders one collapsed `status`
string (`core | enabled | disabled`) from two independent booleans. `dx plugin add` is exactly the
change that makes the collapse wrong.

The state a `dx plugin list` row has to express after that:

| Axis        | Meaning in the CLI                                                           | Where it lives                                  |
| ----------- | ---------------------------------------------------------------------------- | ----------------------------------------------- |
| `installed` | a persisted record exists — compiled-in, or on disk under `plugins/<id>/`    | `plugins/<profile>.yml` (compiled-in: implicit) |
| `enabled`   | imported, registered and activated on **every** `dx` invocation              | same file                                       |
| `core`      | pinned installed+enabled, not disableable (`meta.profile.tags` has `system`) | derived; already enforced in `disable.ts`       |
| `failed`    | installed and enabled, but this run could not load or activate it            | runtime only (`manager.getFailed()`)            |

`failed` is not a fourth state so much as the reason the first two must be shown separately: a
compiled-in plugin cannot fail to resolve, a remote one can (assets deleted, host unreachable, import
throws), and a plugin that silently vanishes from `dx mcp serve`'s tool list with no row explaining
why is the worst failure this feature can produce.

**Install must not import.** This is the load-bearing consequence, and the CLI can have it where the
browser today does not. A published manifest carries the whole of `Config2.Plugin` — `key`, `name`,
`description`, `tags` and `dependsOn` — so `add` can register `Plugin.lazy(metaFromManifest, () =>
import(entryPath))` and get a fully-formed catalog entry, dependency declarations included, without
executing a line of plugin code. Enable is then the single point where third-party code first runs.
The browser's `UrlLoader.preload` does the opposite: it imports every persisted remote entry at boot
and only afterwards consults the enabled set, so an installed-but-disabled plugin runs its module
body on every page load. Worth aligning, but the CLI should not inherit it — see §2.5, where this
boundary is also the cheapest thing we have resembling a consent point.

**One file, not two.** The browser's split (remote records in `localStorage`, enabled ids elsewhere)
is a localStorage artifact, not a design; two files can disagree and something then has to
reconcile them. `plugins/<profile>.yml` should become one list of records — `id`, `enabled`, and for
remotes `url`, `version`, integrity — with compiled-in plugins appearing only once a non-default
state is set for them.

Two hazards in that migration, both in code as written today:

- The file is a bare `Schema.Array(Schema.String)` and `loadEnabledPlugins` **catches a decode
  failure and returns `[]`**; `bin.ts` then reads `savedEnabled.length > 0 ? … : getDefaults()`. So
  shipping a new shape without a union that still accepts the legacy `string[]` silently resets
  every existing profile to defaults, with no error. Union, then write back the new shape.
- An `enabled` id with no installed record is reachable the moment installs live on disk, and
  `createCliApp`'s default `pluginLoader` handles it with `invariant(plugin, 'Plugin not found')` —
  a hard crash at startup, for every command, until the user edits YAML. The rule has to be: an
  unresolvable enabled entry records a failure and is skipped; the binary still runs and
  `dx plugin list` is what explains the absence.

### 2.4 The command surface

- **`dx plugin add <url|name>` installs and enables by default**, with `--no-enable` to stop at
  install. The two-axis model stays in the data; only the default composes them. A CLI `add` that
  leaves the plugin inert is a papercut — `code --install-extension` and `npm install` both do the
  working thing — and `--no-enable` is precisely the "fetch it, let me look at it before it runs"
  flow that §2.3's import boundary makes meaningful.
- **`remove` is not `disable`.** `remove <id>` drops the record and deletes assets; on a compiled-in
  plugin it must fail pointing at `disable`, mirroring the core check `disable.ts` already has.
  Aliases: `install` → `add`, `uninstall` → `remove`.
- **`enable <id>` on a non-installed id** should name `dx plugin add` rather than fail the current
  bare `invariant(plugin, 'Plugin not found: ${id}')`.
- **`add` takes a locator, everything else takes an NSID.** The user types a URL and then needs an id
  for every subsequent verb, so `add` must print the resolved id — the browser's `add` returns the
  plugin for this reason. It also needs `UrlLoader.make`'s duplicate-id guard applied against the
  compiled-in set: a remote plugin claiming a builtin's id would make the builtin unreachable.
- **`list` grows columns** — id, name, source (builtin / url / registry), version, installed,
  enabled, state — instead of the single `status` string. `--json` already exists and should carry
  the same fields.

### 2.5 Open question: isolation

This loads third-party code **in-process with the user's HALO keys, unsandboxed**, and MCP widens
the blast radius: a plugin's operations become tools an external agent can invoke. The browser gets
origin isolation for free; node gets nothing. The range is "trusted publisher + explicit enable"
(what the registry already implies) through to running plugins in a worker behind a
capability-passing boundary — which would also solve reload, since a worker can be replaced.
Undecided; decide before third-party plugins ship, not after.

§2.3's install/enable boundary changes the shape of the cheap end of that range without closing the
question. If install never imports, then `add --no-enable` fetches and records without running
anything, and `enable` is a single auditable moment where a named plugin starts executing with the
user's keys. That is what makes "trusted publisher + explicit enable" an actual consent step rather
than a label on a flow where the code already ran. It does not bound what a plugin does **after**
that point, which is what the worker boundary is for.

## 3. Reload, in two stages

**Stage 1 — developing dxos itself.** `--watch` supervising a child process, restarting on change.
An MCP stdio session dies with the process, so the client reconnects per edit; acceptable for our
own loop. `moon run cli:dev` already runs `dx` from source, so this is a supervisor and a file
watcher.

**Stage 2 — external plugin authors.** The loop that pays, and the browser shows its shape: a dev
manifest with `devEntry` served by Vite. The CLI equivalent is
`dx mcp serve --dev-plugin http://localhost:3967/manifest.json`, re-importing on change with a
cache-busting query (each import URL is distinct, so no module-cache purge), rebuilding the projected
layer, and emitting `tools/list_changed` / `prompts/list_changed` — which the server already emits
at startup and clients already act on.

Two obstacles, both real:

- `McpServer` exposes `addTool`/`addPrompt` and **no removal**, so a changed surface cannot replace
  the old one without rebuilding the server layer under the live transport. Upstream change or a
  scope dance.
- Re-importing a plugin that registers ECHO types collides with process-global schema registration
  ("Schema version already registered"). Registration has to become idempotent, or scoped per load.

A worker-per-plugin boundary (§2.3) would sidestep both, at the cost of a serialization seam between
the host and plugin handlers.
