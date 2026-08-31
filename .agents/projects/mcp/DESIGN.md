# mcp — Design

Companion to [TASKS.md](./TASKS.md). The loop design (Claude ⇔ MCP ⇔ EDGE ⇔ Composer) lives in
[agents/superpowers/specs/2026-07-31-local-edge-mcp-composer-roundtrip-design.md](../../../agents/superpowers/specs/2026-07-31-local-edge-mcp-composer-roundtrip-design.md);
the tool-surface work-stream is the edge repo's `mcp-operations` project. This file holds the
dxos-side decisions those two don't cover.

## 1. Two hosts, one surface

`@dxos/mcp-server` owns everything that decides what a model sees **of the operation surface**: the
three tools over the registry, opted-in skills as prompts, `loadSkill`, ref widening, the wire
response passes, and the stdio transport that applies them. For that surface a host supplies echo's
`Registry.Service` (a registry holding `PersistentOperation` and `Skill` entities) and
`McpServer.Host` (the invoke seam plus the session's spaces) — and nothing else. Each host still
hand-writes its own static toolkit beside it (§1.1), which is duplication rather than a deliberate
host-layer boundary.

### 1.0 Operations are found, not advertised (2026-08-20)

The projection spent one MCP tool per operation, so every operation's name, description and full
input schema entered the client's context at `tools/list` whether or not the task touched it — and
the cost grew with every plugin a host enabled (27 tools on `dx mcp serve` before this change,
7 after). The Cloudflare and PostHog MCP servers answer this the same way, and so does this one
now: a fixed surface of `queryOperations` (search; a `keys` lookup returns the schemas),
`invokeOperation` (dispatch by key) and `loadSkill`.

**Second round (user, 2026-08-21): the backend is echo's registry, not a custom catalog.** The
first cut re-implemented storage and search (`ProjectedOperation`, `OperationEntry`, a `Catalog`)
over wire-record lists — but `PersistentOperation` and `Skill` are ECHO entities and echo's
`Registry` already stores keyed entities and answers the standard Query DSL. So: `projection.ts`,
`catalog.ts` and the whole `McpRegistry` wrapper are gone; the surface queries `Registry.Service`
directly (`Filter.type`, `Filter.text` — in-memory text matching added to the registry in echo for
this, DB paths untouched — and `getByURI` for key lookups in any spelling). Handlers query live,
so an operation registered after startup is findable without a rebuild; only the prompt list is
captured at layer build (effect's `McpServer` has no removal). What remains host-specific is
`McpServer.Host` — `invoke` + `spaceIds`. No exported intermediate types survive except the
`queryOperations` row.

Three consequences worth stating, because each removes something that used to be load-bearing:

- **The tool-name contract is gone.** A tool name was the key's final segment inside a 64-char
  budget, so a long segment could not be advertised and two operations sharing a segment were a
  collision the projection threw on. Addressed by key, neither is a constraint — and the reserved-name
  check now guards only this package's three names against a host's static toolkit.
- **Safety moved from annotations to data.** A per-operation tool carried
  `readOnlyHint`/`destructiveHint`, which is what a client turns into its permission prompt. One
  dispatch tool cannot: it is marked possibly-destructive because some operation behind it is, so a
  client can no longer auto-approve a read. The classification still reaches the _model_, on the
  `mutation` field of the row. That is the real cost of this shape, and it is why a read/write tool
  split stays on the table if the permission friction bites.
- **The skill pointer moved with it.** A governed tool's description used to carry "call
  loadSkill('x') first"; a row names its skills as a field instead, and `loadSkill` gained a listing
  mode so a model can see the workflows before it has searched for any operation.

What did not change: skills remain the atomic unit of projection — an operation in the registry
that no opted-in skill's `tools` list names is neither findable nor invocable — and both hosts pick
the reshape up from the package, EDGE on its next pin bump.

**How EDGE wires it** (verified against `edge/packages/services/mcp-space-service/src/mcp/gateway.ts`
and `operation-service/src/entrypoint.ts`): its `gatewayLayer` currently maps the
`OPERATION_SERVICE` binding onto the old list-shaped contract. Under the new shape it fetches the
same RPC lists once and builds a local registry with `McpServer.hydrateRegistry({ operations,
skills })` — operation records hydrate via `Obj.fromJSON`, skills rebuild as detached entities with
their instructions text embedded, because `instructions.source` is a `Ref` that crosses RPC as a
pointer nothing can resolve (edge's own TODO at entrypoint.ts:296 already names exactly this
materialize-alongside shape) — and supplies `Host` from the binding's invoke plus the grant's
`spaceIds`. The round trip is pinned dxos-side by the `hydrateRegistry` test in `McpServer.test.ts`,
so the fidelity contract covers the hydrated path too.

**The live-registry guarantee is in-process only.** Handlers query the registry per request, so an
in-process host (the CLI) serves an operation registered a moment ago without a rebuild. A hydrated
registry is a point-in-time copy of an RPC response: EDGE builds it per session, so operation-service
changes after that point are invisible to `queryOperations`, `invokeOperation`'s validation and
`loadSkill` until the next build. Acceptable while a worker's projection layer is per-request or
short-lived, and the reason the EDGE follow-through should either rebuild on its own cadence or
subscribe operation-service updates into the registry — decided there, not here.

Two hosts consume it: edge's `mcp-space-service` (OAuth, grants, service bindings, trace feed) and
`dx mcp serve` (stdio, local client, no auth by design — OAuth is host-layer and host-layer is what
the local twin replaces). The fidelity contract: deltas are host-layer only. Anything that changes
the tool list, descriptions, schemas, prompts or `loadSkill` output lives in the package, or it is a
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

**Corrections from building it** (2026-08-15/17, measured from source rather than a compiled binary):

1. `build.module` registers **exact specifiers**, and nearly every real import is a subpath —
   `@dxos/app-framework/Plugin`, never the barrel. The subpaths have to be enumerated: resolve the
   bare specifier, walk up to the package root, and read its `exports` keys (most packages do not
   export `./package.json`, so it cannot be resolved directly). 116 declared packages yield 231
   registrable specifiers in ~7 ms; 88 are absent from the CLI (React and friends, deliberately)
   and 20 wildcard export keys cannot be enumerated statically.
2. A factory that imports **its own specifier** recurses into the registry: `build.module`
   intercepts every import of that specifier, the host's included, so the naive
   `build.module(spec, () => import(spec))` hung the CLI before it ran any command. Resolve to a
   file URL first and import that.
3. **`onResolve` is not an option.** It looked like the natural fit — one filter covering a package
   and all its subpaths, no enumeration — but bun's runtime ESM loader never consults it. Measured:
   zero hook invocations, both for a plugin outside the tree _and_ for one inside it that loads
   successfully. It is a bundler hook. `build.module` is the only runtime mechanism.
4. **Bun auto-install would otherwise win.** A plugin under `plugins/<id>/` has no `node_modules`
   above it, so bun resolves its bare `@dxos/*` imports out of its own install cache — loading a
   _published_ `@dxos/app-framework` that then fails on its own `effect/Context` import.
   `build.module` takes precedence over that, which is what makes a snapshot install loadable at
   all.

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

**Decision (2026-08-15, user): parity with Composer.** Same two axes, same verbs, same meanings. The
CLI does not get its own plugin-lifecycle model.

That settles the question but is worth grounding, because the CLI is a short-lived process and
"installed but disabled" reads at first like "bytes on disk that do nothing" — which sounds like a
state with no purpose. Three things make it load-bearing, and they are stronger in the CLI than in
Composer rather than weaker:

- **Startup cost is paid per command, not per session.** Composer amortizes activation over a long
  session; `dx` pays it on every invocation. An enabled plugin is a tax on `dx space list`.
  Disabling is how a user gets a fast `dx` without losing the plugin, and it is the only lever they
  have.
- **Enabled plugins claim namespace.** They contribute `Capabilities.Command` (top-level `dx` verbs)
  and, through `dx mcp serve`, MCP tool names. Two plugins wanting the same verb is resolved by
  disabling one, not by deleting it.
- **Enabled is the MCP exposure boundary.** The gateway projects every enabled plugin's operations
  as tools an external agent can invoke. "Installed but disabled" means "on disk, but Claude cannot
  call it" — the closest thing to a permission the CLI has, and the reason §2.6 is not academic.

Uninstall throws away assets and the version pin; disable keeps them, so re-enabling is instant and
offline where re-installing needs the network and may resolve differently.

Where the CLI genuinely differs from Composer is not the model but the **flow**: Composer's
install-now-enable-later is natural because you are browsing a registry UI, whereas someone typing
`dx plugin add` almost always wants the thing working. So the state is rare as a _default_, not rare
as a _state_ — which is why `add` enables by default (§2.4).

#### What exists today

`PluginManager` has had both axes since it was written — `add`/`remove` register and unregister,
`enable`/`disable` turn a registered plugin on, and `add`'s contract is explicitly "registers it
**without enabling it**". `dx plugin enable|disable|list` exist (contributed by `plugin-registry`,
which is `system`-tagged so its commands are always reachable) and persist to
`plugins/<profile>.yml`.

**But no compiled-in plugin can actually land in the installed-but-disabled state.** Counting the
CLI's set in `commands/plugin-defs.ts` against the `system` tag in each plugin's `dx.config.ts`:

| Bucket                            | Plugins                                                                     | Disableable |
| --------------------------------- | --------------------------------------------------------------------------- | ----------- |
| core (`tags: ['system']`)         | client, registry, space, connector, routine, observability, process-manager | no          |
| default-enabled (`getDefaults()`) | chess, sample, inbox, markdown                                              | yes         |
| installed, not enabled            | — none —                                                                    | n/a         |

Eleven plugins, seven core, four defaults, nothing left over. So the practical experience is "every
built-in is always on", and `disable` can only ever turn off four content plugins. The mechanism is
there; the state has no inhabitants.

Two things follow:

- **The `system` tagging is a Composer judgment inherited wholesale.** Each plugin declares
  `tags: ['system']` in its own `dx.config.ts`, so the CLI has no say — `observability` and
  `connector` are non-disableable in `dx` because they are non-disableable in Composer. Some of
  that is right (`client`, `space`), some deserves a deliberate CLI answer. Core needs to be a
  host-supplied set, or the tag needs a host-scoped variant — and that is a framework change before
  it is a CLI one: `ManagerOptions` exposes no `core` field, so `ManagerImpl`'s constructor derives
  the set from `meta.profile.tags` with no way for a host to override it.
- **`getDefaults()` is a fixed four-element list that ignores its own config.** The CLI's
  `PluginConfig` declares `isDev` / `isLabs` / `isStrict` and `getDefaults()` takes no arguments,
  where composer-app's takes the same config and branches on it. Parity means the CLI's defaults
  become a real editorial choice about which extra `dx` verbs a fresh profile has.

The state a `dx plugin list` row has to express once remotes exist:

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
body on every page load. Worth aligning, but the CLI should not inherit it — see §2.6, where this
boundary is also the cheapest thing we have resembling a consent point.

The one exception, found while building it: `add --dev <path>` against a checkout that has not been
built has no `manifest.json` to read, and falls back to evaluating that directory's `dx.config.ts`.
That is a weaker bar, and deliberately so — it is bounded to `--dev`, where the argument is a path
on the user's own disk, and it is the same bar as running the checkout's build, which is what would
have produced the manifest. The property holds exactly where the trust question is real: nothing
reached from a URL is imported until `enable`.

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

The whole of plugin management, at Composer parity — not just the `add` verb. Today only
`enable|disable|list` exist and, per §2.3, they govern four content plugins.

- **`dx plugin add <url|name>` installs and enables by default**, with `--no-enable` to stop at
  install. The two-axis model stays in the data; only the default composes them. A CLI `add` that
  leaves the plugin inert is a papercut — `code --install-extension` and `npm install` both do the
  working thing — and `--no-enable` is precisely the "fetch it, let me look at it before it runs"
  flow that §2.3's import boundary makes meaningful.
- **A real default set, and a CLI-owned core set.** `getDefaults()` becomes a deliberate choice
  about which extra `dx` verbs a fresh profile has rather than a copied list, and the
  core set moves from each plugin's `system` tag to something `createCliApp` supplies, so the CLI
  can decide that a plugin Composer pins is merely default-enabled here. That last part is an
  app-framework change, not a CLI one: `ManagerOptions` exposes no `core` field, so the manager
  computes the set in its constructor from `meta.profile.tags` and no host can override it.
- **`remove` is not `disable`.** `remove <id>` drops the record and deletes assets; on a compiled-in
  plugin it must fail pointing at `disable`, mirroring the core check `disable.ts` already has.
  Aliases: `install` → `add`, `uninstall` → `remove`.
- **`enable <id>` on a non-installed id** should name `dx plugin add` rather than fail the current
  bare `invariant(plugin, 'Plugin not found: ${id}')`.
- **`add` takes a locator, everything else takes an NSID.** The user types a URL and then needs an id
  for every subsequent verb, so `add` must print the resolved id — the browser's `add` returns the
  plugin for this reason. It also needs `UrlLoader.make`'s duplicate-id guard applied against the
  compiled-in set: a remote plugin claiming a builtin's id would make the builtin unreachable.
- **`list` grows columns** — id, name, source (builtin / url / registry / dev), version, installed,
  enabled, state — instead of the single `status` string. `--json` already exists and should carry
  the same fields.

### 2.5 Dev plugins are `add --dev`, not a second verb

An earlier draft of this section proposed `dx plugin link <path>` / `unlink <id>` alongside `add`.
One verb is better, and the reason is worth stating because it also fixes what the two-verb split
could not express.

**The locator dispatches itself.** URL versus filesystem path is decidable from the argument, the way
`npm i lodash` / `npm i ./local-pkg` / `npm i git+https://…` are. That is not a second verb's worth of
difference.

**What actually varies is one bit: copy or reference.** `add <url>` snapshots into
`~/.config/dx/plugins/<id>/` and owns the copy; a dev install points at a directory the user owns and
re-reads it. That bit outlives the command — it decides whether `remove` deletes anything and whether
edits to the source reach the installed plugin. One bit is a flag (`pip install -e`, `cargo add
--path`), not a verb. npm's `link` is a poor model here: it is really about npm's global symlink
registry, a mechanism we do not have.

**And the two axes are orthogonal**, which is what the two-verb split got wrong — it assumed URL
implies copy and path implies reference:

|      | copy (snapshot)                 | reference (live)                                |
| ---- | ------------------------------- | ----------------------------------------------- |
| URL  | `add <url>`                     | `add --dev http://localhost:3967/manifest.json` |
| path | `add ./dist` — snapshot a build | `add --dev ./packages/plugins/plugin-markdown`  |

The top-right cell is the browser's existing dev-plugin flow (`devPluginUrl` against a Vite
`devEntry` manifest), and `link <path>` could not express it.

**`--dev` names a bit the framework already carries.** `LoadedPlugin.dev` exists, and
`PluginCatalog` already keys shadow-on-id-collision off it: a dev-sourced plugin displaces an
already-registered one of the same id, stashing it with its `wasEnabled` for restoration on remove.
So the flag sets existing state rather than introducing any, and `add --dev ./plugin-markdown`
overriding the compiled-in markdown plugin works through machinery that is already written.

Two consequences to keep:

- **One `remove`.** It consults the installed record's kind: delete the copy, or forget the
  reference. Two verbs would have differed only in whether files are unlinked.
- **`--dev` stays coupled to shadowing.** It means both "do not copy" and "may take a builtin's id".
  The browser couples them the same way — `UrlLoader.make` runs its duplicate-id check only
  `if (!manifest.dev)` — and the coupling is what stops a registry install permanently shadowing
  `plugin-space`. Overriding a builtin is only ever a development act.

**No manifest needed for a path.** Every in-repo plugin's meta already comes from its own
`dx.config.ts` (`Plugin.getMetaFromConfig(config)`), the same `Config2.Plugin` shape a published
manifest carries. So a dev install from a directory needs neither a build output nor a served
manifest — better ergonomics than the browser's manifest+Vite dance, and it falls out of what exists.

Unmeasured, and it decides how much that is worth: **whether a compiled `dx` binary can import
on-disk TypeScript at runtime.** §2.1 measured ESM import from a compiled binary; TS transpilation
inside a standalone executable is a different question. If it works, `add --dev <path>` needs no
build step and the author's loop is edit-and-rerun. If not, it requires a built entry in the
directory, and unbuilt-source iteration stays a `moon run cli:dev` (bun-from-source) affair — fine
for us, poor for an external author. Measure before designing around either.

### 2.6 Open question: isolation

This loads third-party code **in-process with the user's HALO keys, unsandboxed**, and MCP widens
the blast radius: a plugin's operations become tools an external agent can invoke. The browser gets
origin isolation for free; node gets nothing. The range is "trusted publisher + explicit enable"
(what the registry already implies) through to running plugins in a worker behind a
capability-passing boundary — which would also solve reload, since a worker can be replaced.
Undecided; decide before third-party plugins ship, not after.

§2.3's install/enable boundary changes the shape of the cheap end of that range without closing the
question. Where it holds — every URL install, which is every install of code the user did not write
— `add --no-enable` fetches and records without running anything, and `enable` is a single auditable
moment where a named plugin starts executing with the user's keys. (`--dev` against an unbuilt
checkout is the documented exception, and it is not a publisher-trust case: the argument is the
user's own working directory.) That is what makes "trusted publisher + explicit enable" an actual consent step rather
than a label on a flow where the code already ran. It does not bound what a plugin does **after**
that point, which is what the worker boundary is for.

**The consent step is now explicit** (2026-08-15). `add` names the plugin and where it came from,
says that its code runs with the user's HALO identity and that `dx mcp serve` exposes its operations
to an AI agent, and asks. A non-interactive caller has to pass `--yes` rather than being assumed to
consent — the same posture `dx admin identity delete` takes with `--force`, and the only way the
prompt means anything in a script. It is asked at `add` rather than `enable` because `add` enables
by default, so `enable` would be silent on the common path; a plugin already consented to is not
re-asked.

`--watch` sharpens the argument for a real boundary rather than weakening it: a dev plugin's code is
re-executed automatically on every file change, so the human beat between "author saves" and "code
runs" is gone after the initial consent. That is the intended dev loop, and it is exactly the
property the worker boundary would bound.

## 3. Reload, in two stages

**Stage 1 — developing dxos itself.** `dx mcp serve --watch`, shipped. The premise this was planned
on — "an MCP stdio session dies with the process, so the client reconnects per edit" — turned out to
be false, which made the stage cheaper _and_ better than budgeted. `bun --watch` reloads **in place**:
same pid, same pipes, and a wiped JS realm. Measured, not assumed — a reload keeps `process.pid`
constant, data written to the child's stdin after the edit reaches the new instance, and `globalThis`
comes back empty, so module-level and global registries both reset (which is also why the stage-2
schema-re-registration obstacle below does not apply here).

What survives is the connection; what dies is the session. So the supervisor's job is not to make
the client reconnect but to hold the handshake outside the realm and replay it: it caches the
client's `initialize` and `notifications/initialized`, re-drives them into the fresh realm under a
namespaced id whose response it swallows, errors the requests the reload stranded, and emits
`tools/list_changed` / `prompts/list_changed`. An edit is invisible to the client. The watching
itself is delegated to `bun --watch`, whose file set is exactly the imported module graph.

**The flag ships in the binary too**, which is where it pays: a plugin author has the released `dx`,
not a dxos checkout. It was source-only for one revision on the theory that a binary has nothing to
watch — true of the CLI's own code, false of the thing that matters. Two strategies, chosen by
`globalThis.DX_CLI_BUNDLED`:

- **From source**, `bun --watch` runs the child and tracks the imported module graph. It reloads in
  place, so the supervisor only has to replay the handshake.
- **From the binary**, bun's watcher is absent (a compiled binary takes `--watch` as ordinary argv —
  measured), so the supervisor re-runs the binary via `process.execPath` and arms recursive
  `fs.watch` itself. Both work inside a compiled binary; so does importing on-disk TypeScript, so an
  author needs no build step.

**The watch set is reported by the child, not derived by the supervisor.** The child has the profile,
the records and the resolved paths, so it emits its `link`-install directories on the ready sentinel
it already writes. The supervisor stays a JSON-RPC proxy that knows nothing about plugins, and
adding or removing a dev plugin re-arms the watch on the next reload for free. `copy` installs are
skipped: the CLI owns those bytes and only `add` rewrites them.

The `DX_CLI_BUNDLED` define is a build-time constant rather than a runtime check because
bundled-ness is only observable at runtime (`import.meta.dir` is `/$bunfs/root` in a binary), and
while the strip it originally served is gone — the binary needs the supervisor now — the constant
still has to pick the strategy. Its target is a global rather than `process.env.*`: both fold and
both stay safe unreplaced on the source path, where no bundler runs, but a bare identifier throws
`ReferenceError` there and an env var can be flipped by a stray exported variable. Measured across
all three.

`--watch` also runs its child with `--conditions=source`. Without it every `@dxos/*` import resolves
to `dist`, so the watcher tracked build output and a plugin source edit reloaded nothing until that
package was rebuilt — the flag fired on builds rather than on edits. `DX_SOURCE=0` opts back out.
Related trap for anyone debugging a watch that will not fire: only imported files are watched, and
the CLI imports subpaths rather than barrels, so a package's `src/index.ts` is frequently not on the
path at all.

The remaining cost is latency: a reload is a full server start, identity and plugin activation
included.

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

A worker-per-plugin boundary (§2.6) would sidestep both, at the cost of a serialization seam between
the host and plugin handlers.
