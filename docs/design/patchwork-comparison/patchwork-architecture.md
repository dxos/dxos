# Appendix: Patchwork System architecture report

> Generated from a source review of https://github.com/inkandswitch/patchwork-system
> at commit `94733925d493ea2e1b2a45139d4cd61e78621958` (2026-07-24). File
> references (`path:line`) are relative to that repo's root.

This repository is the **infrastructure/core** for Patchwork, not the end-user application. It ships a bootloader, a plugin registry, a document-addressable "filesystem," a custom-element rendering shell, and a DOM-event-based service-injection protocol — everything a "site" needs to boot a malleable, Automerge-backed environment and dynamically load tools. The actual default tool suite ("patchwork-frame", the three-pane shell, the account/folder/comments datatypes, the "Packages" UI) lives in a **sibling repo** (referenced but absent here — `patchwork-tools`/`patchwork-frame`), loaded at runtime as an ordinary module. `patchwork.inkandswitch.com` is likewise a separate downstream site repo; CI here (`.github/workflows/ci.yml:23-30`) just fires a `repository_dispatch` (`core-main`) to trigger its rebuild.

## 0. Top-level layout and doc sources

- `AGENTS.md:1-25` — this is a Changesets monorepo; every package under `core/`/`packages/` is independently versioned and released.
- `README.md:1-21` — "Patchwork System… holds… the famous Patchwork frame" (frame itself not present); `pnpm dev` / `SITE=<name> pnpm dev`.
- `pnpm-workspace.yaml:1-6` — workspaces: `core/*`, `e2e`, `packages/*`, `packages/providers/**/*`, `sites/*`. A `catalog:` pins exact Automerge/Keyhive/Subduction pre-release versions (e.g. `@automerge/automerge-repo: 2.6.0-subduction.46`, `@keyhive/keyhive: 0.1.0-alpha.5`), confirming this is pre-1.0, actively-forked-off-mainline Automerge tooling.
- Package graph: `core/filesystem` (no deps on plugins) → `core/plugins` (depends on filesystem) → `core/elements` + `packages/providers/core` → `core/bootloader` → `core/patchwork` (the one-import site package) → `sites/gaios.sgai.uk`.

## 1. Core abstractions & vocabulary

The system's vocabulary is defined almost entirely as small TypeScript types, not classes/frameworks:

- **Plugin** (`core/plugins/src/registry/types.ts:24-60`) — the umbrella concept. A `PluginDescription` is `{ id, type, name, icon?, importUrl? }`. A `LoadablePlugin` adds either `load(): Promise<I>` or `import: string` (a bare module specifier/URL) — i.e. every extension point is "a description plus a lazy loader." A `LoadedPlugin` is the description merged with `{ module: I }` once loaded.
- **Datatype** (`core/plugins/src/datatypes.ts:10-34`) — a `PluginDescription` of `type: "patchwork:datatype"` whose implementation is `{ init(doc, repo), getTitle(doc), setTitle? }`. Datatypes are how a fresh Automerge document gets its initial shape and a human title; `createDocOfDatatype2` (`datatypes.ts:37-64`) creates a doc, calls `datatype.module.init(doc, repo)`, and stamps `doc["@patchwork"] = { type, suggestedImportUrl }`.
- **Tool** (`core/plugins/src/tools.ts:18-51`) — `type: "patchwork:tool"`, implementation `ToolRender = (handle: DocHandle<T>, element: ToolElement) => () => void` — a tool is literally a function that mounts into a plain DOM element and returns a teardown. `supportedDatatypes: "*" | string[]` declares which datatypes it can render; `getFallbackTool`/`getSupportedTools` (`tools.ts:55-83`) pick the best match, preferring specific matches over `"*"` wildcards.
- **Component** (`core/elements/src/patchwork-view.ts:31-49`) — `type: "patchwork:component"`, a newer/parallel extension point: `ComponentRender = (element: PatchworkViewElement, repo: Repo) => () => void`. Unlike Tools, Components are not keyed by datatype — they're addressed directly by id via the `component` attribute.
- **Document / `@patchwork` metadata** (`core/filesystem/src/metadata.ts:6-14`) — every ECHO-equivalent unit is a plain Automerge document carrying `HasPatchworkMetadata`: `{ "@patchwork": { type, suggestedImportUrl?, copies?, copyOf?, history? } }`. `getType(doc)` is the universal datatype discriminant used everywhere (router, tool-resolution, module system).
- **FolderDoc** (`core/filesystem/src/types.ts:6-25`) — `{ title, docs: DocLink[] }` where `DocLink = { name, type, url: AutomergeUrl, icon?, copyOf? }` — the "directory" primitive. A **package** is just a FolderDoc whose docs include a `package.json` file-doc (see §2).
- **ModuleSettingsDoc** (`core/filesystem/src/module-watcher.ts:17-21`) — `{ "@patchwork": { type: "patchwork:module-settings" }, modules: AutomergeUrl[] }` — the list of module URLs a scope should load; this is the concrete "extensibility registry" document.
- **AccountDoc** (`core/plugins/src/account.ts:18-28`) — the per-user root object: `{ frameToolId, accountSidebarToolId, contextSidebarToolId, contextToolIds, documentToolbarToolIds, rootFolderUrl?, moduleSettingsUrl?, contactUrl? }`. It is itself created via the `account` datatype (which core doesn't implement — it's expected from `patchwork-frame`, see `core/patchwork/src/types.ts:42-43`).
- **Site** — a `vite.config.ts` that imports `@inkandswitch/patchwork/vite` and calls `patchwork({...})` (see §8), plus a `main.ts` calling `setup()` from `@inkandswitch/patchwork` (see §3/§9).
- **Frame** — referenced only as an external concept ("the famous Patchwork frame", `@inkandswitch/patchwork-frame` bundle) — the shell/three-pane UI that supplies `account`, folders, and the default tool set. Not in this repo.
- **EdgeHandle** (`packages/edge-handles`, README) — a separate, lower-level dataflow primitive: "a doc-backed reactive cell with named upstream and downstream connections," deliberately not a transformer, meant as the substrate other dataflow tools build on.

## 2. Module/extension system

**Manifest shape.** A module is any ES module (bare JS bundle or Automerge folder-doc) whose default/named export includes a `plugins` array of `LoadablePlugin` objects. Concrete worked example (`packages/e2e/fixtures/counter.js:1-45`):

```js
export const plugins = [
  {
    type: 'patchwork:datatype',
    id: 'counter',
    name: 'Counter',
    async load() {
      return {
        init(doc) {
          doc.count = 0;
        },
        getTitle: () => 'Counter',
      };
    },
  },
  {
    type: 'patchwork:tool',
    id: 'counter-viewer',
    name: 'Counter Viewer',
    supportedDatatypes: ['counter'],
    async load() {
      return (handle, element) => {
        /* mount DOM, return cleanup */
      };
    },
  },
];
```

**Registration & discovery.** `registerPlugins(plugins, importUrl)` (`core/plugins/src/registry/index.ts:58-72`) fans each plugin out to a type-keyed `PluginRegistry` (one per `plugin.type`, lazily created by `getRegistry`). `PluginRegistry.load(id)` (`core/plugins/src/registry/registry.ts:117-217`) is the loader: if already loaded, return it; if an in-flight load promise exists, return that (de-duped); otherwise call `description.load()` or `import(description.import)`, then replace the registry entry with `{ ...description, module: implementation }` and emit `"loaded"`. `loadWhenReady(id)` (`registry.ts:92-111`) additionally waits on the `"registered"` event if the id isn't registered yet — used when a consumer (e.g. `resolveAccountHandle`) needs a datatype that ships in a bundle still loading.

**Loading is genuinely dynamic/runtime.** `ModuleWatcher` (`core/filesystem/src/module-watcher.ts:98-477`) is the live-reload engine:

- Constructed with a map of named sources (`{ system: url, user: url, ... }`, each either an Automerge `ModuleSettingsDoc` URL — live-reloaded via `handle.addListener("change", …)` — or a static HTTP(S) JSON manifest fetched once).
- For each `modules` entry it either (a) if it's an Automerge URL, `repo.find()`s the folder doc, watches its heads for changes (debounced 250ms, `RELOAD_DEBOUNCE_MS`), and imports its package entry point _pinned to those heads_ (`handle.view(heads).url`), or (b) if it's a bare URL, dynamically `import()`s it directly.
- Package import for an Automerge folder-doc (`core/filesystem/src/packages.ts:34-54`, `216-284`) fetches `package.json` **as an HTTP request against a service-worker-served URL** of the form `origin/<encodeURIComponent(automergeUrl)>/package.json`, resolves the `exports`/`main` field via the `resolve.exports` npm package with conditions `["patchwork","browser","import"]`, then `import()`s the resolved entry URL. This means **Automerge documents themselves are served as an installable npm-package-shaped virtual filesystem** through the service worker — a folder doc _is_ a package.
- Retries on import failure with backoff `[1s,2s,5s,10s,20s]` (`RETRY_DELAYS_MS`), and a generation counter per module key so a stale retry never regresses a newer version.
- `registerPlugins`/`unregisterPlugins` (`core/plugins/src/registry/index.ts:79-87`) are the load/unload hooks wired to `ModuleWatcher`'s callbacks (`core/patchwork/src/index.ts:212-220,364-374`), so removing a module URL from the settings doc unregisters every plugin it contributed.
- In the browser, discovery is split across a worker for isolation/perf: `importAutomergePackageViaWorker` (`core/bootloader/src/module-loader.ts:63-79`) posts to a dedicated Worker (`module-loader-worker.ts:43-68`) which imports the package **off the main thread** purely to read its `plugins` array and strip non-cloneable fields (`load`, `import`, `module`), posting back plain descriptors; the main thread then re-imports the package (pinned to the same heads) only when a specific plugin is actually `load()`ed. This two-phase split keeps hostile/buggy module top-level code off the main thread for discovery.

**`scripts/module-settings/register-module`** (a bash shim invoking `add-module-to-settings.ts` via `tsx`) is the **operator CLI** (`pw-modules`/`patchwork-modules`) for managing a `ModuleSettingsDoc` over Subduction from Node:

- `pw-modules init` creates a fresh settings doc (`@patchwork: {type: "patchwork:module-settings"}, modules: []`) and syncs it.
- `pw-modules add <settings-url> <module-url>` / `remove` push/pull an Automerge URL from `doc.modules` (idempotent).
- Intended two-step workflow with the separate `pushwork` tool: `pushwork sync` publishes a built tool folder into Automerge and prints its URL; `pw-modules add` registers that URL against a settings doc a site was booted with (`MODULE_SETTINGS_DOC_URL`).

**Module dependencies.** There is no explicit dependency graph between modules — modules only depend on each other implicitly through **registry lookups by id** (e.g. `resolveAccountHandle` calls `datatypes.loadWhenReady("account")`, `createDefaultAccount` loads `"folder"`, `"patchwork:module-settings"`, `"contact"` datatypes). A module registering later is fine because consumers `await` on the registry rather than assuming synchronous availability. There's no versioning/semver constraint system for plugin ids — `PluginRegistry.register` just warns and overwrites on id collision from a different `importUrl` (`registry.ts:49-57`).

## 3. Bootloader (`core/bootloader`)

`core/bootloader` is deliberately the **non-UI, DOM/worker-plumbing layer**; `core/patchwork` is "one import for a Patchwork site" that composes bootloader + elements + plugins + providers plus routing (`core/patchwork/src/index.ts:1-19` docblock).

Boot sequence (`core/patchwork/src/index.ts`, function `doSetup`, lines 116–300):

1. `initWasm()` (`core/patchwork/src/repo.ts:38-50`) fetches and initializes `automerge.wasm` + subduction wasm (memoized), unless a `Repo` was supplied.
2. `setupServiceWorker()` (`core/bootloader/src/setup.ts:517-591`) registers `/service-worker.js`, waits for it to activate/control the page, and boots a `SharedWorker` (`/automerge-worker.js`) that owns the real Automerge `Repo`, IndexedDB storage, and Subduction network endpoints (one instance shared by every tab). It wires:
   - A `BroadcastChannel` handoff protocol (`HANDOFF_CHANNEL`, `types.ts:7-194`) so the service worker forwards fetches for `automerge:` URLs to the SharedWorker, which resolves them from the repo and returns cache-fillable responses (or an explicit network-error abort when heads haven't arrived — deliberately not a 404, `types.ts:164-176`).
   - A heartbeat/probe-based dead-worker detector (`setup.ts:243-368`) that recreates the SharedWorker and re-wires every repo port if it goes silent — SharedWorkers can be killed under memory pressure.
3. `createRepo(siteName, workerAdapter)` (`core/patchwork/src/repo.ts:52-106`) builds the tab-local `Repo`, either wrapping a Keyhive-enabled repo (`initializeAutomergeRepoKeyhiveWithRepo`) or a plain `Repo` with a `MemorySigner` identity and a narrow `sharePolicy` (only shares with `"automerge-worker"` peers) — network transport is exclusively the `MessageChannelNetworkAdapter` to the SharedWorker; the tab never opens its own WebSocket.
4. `registerRepoProviderElement` / `registerPatchworkViewElement` (§5/§6) register the two custom elements the whole UI hangs off of.
5. `ModuleWatcher` is constructed against the site's built-in module sources (`options.packageListURL`, named `system`/`system-N`), using the worker-backed discovery importer.
6. `resolveAccountHandle` (§1/§6) finds-or-creates the user's account doc (localStorage-pointer pattern with retry-before-replace semantics, `core/plugins/src/account.ts:42-90`).
7. Once the account doc resolves, its `moduleSettingsUrl` is wired in as the `"user"` module source (`wireModuleSettings`, `index.ts:379-393`) — user-installed tools augment, not replace, the site's built-ins.
8. `createRouter` (§5) installs hash-based navigation once `moduleWatcher.doneLoading` settles; the root element stays `visibility: hidden` until a `patchwork:mounted` event fires (`installReveal`, `index.ts:304-331`) or a 12s timeout forces a reveal so users never see a permanently blank page.
9. Resolves with the `Patchwork` API object (`repo, hive, account, signer, create, open, find, packages, plugins, sw`) — this is what a site assigns to `window.patchwork`.

`setup()` enforces a single call per page (`setupCalled` guard, `index.ts:81-112`) and races the whole boot against a configurable timeout (default 30s).

"Site assembly" concretely means: a site is nothing more than an `index.html` + `main.ts` calling `setup({ packageListURL, accountKey, name })`, plus a `vite.config.ts` using the `patchwork()` vite plugin (§8) to generate the service-worker/importmap/manifest/icons wiring. Everything else (which tools exist, what the shell looks like) is pulled in at runtime from Automerge-hosted or HTTP module bundles.

## 4. Data layer

**Automerge/automerge-repo: confirmed, and forked/pre-release.** `pnpm-workspace.yaml` pins `@automerge/automerge@3.3.2`, `@automerge/automerge-repo@2.6.0-subduction.46` (note the `-subduction` pre-release tag — this is Ink & Switch's own fork/branch of automerge-repo with **Subduction** sync built in), plus `@automerge/automerge-repo-keyhive` (alpha), `@automerge/vanillajs`, `@automerge/automerge-subduction`, and `@keyhive/keyhive` (wasm-based access control/identity, alpha). Nearly every runtime package (`core/bootloader`, `core/patchwork`, `core/elements`, `core/filesystem`, `core/plugins`) declares these as (peer)dependencies.

**Document typing/validation.** Typing is structural/duck-typed TypeScript, not runtime-validated: `HasPatchworkMetadata<Type>` (`core/filesystem/src/metadata.ts:6-14`) is the only universal contract, checked at runtime only by presence of `doc["@patchwork"].type` (`getType`). There is no schema/validation library (no zod/Effect Schema) anywhere in `core/*` — datatypes are responsible for shaping their own doc via `init(doc, repo)`, and nothing enforces the shape afterward. This is a deliberately "unopinionated" stance (see §9).

**Document linking.** `DocLink = { name, type, url: AutomergeUrl, icon?, copyOf? }` (`core/filesystem/src/types.ts:17-23`) is the primitive edge in a FolderDoc's `docs` array; `findHandleInFolderHandle` (`core/filesystem/src/find-handle.ts`) walks a `path.split("/")` through nested folders. A separate, more general path resolver, `resolvePath`/`resolvePathInternal` (`core/filesystem/src/resolve.ts:156-183`), supports two "filesystem strategies" — legacy `FolderDoc` (name-keyed `docs[]`) and a newer `"directory"`-typed doc (a plain nested object graph whose leaves may be Automerge URLs, `content`/`mimeType` file-doc shapes, `Uint8Array`, `ImmutableString`, or JSON-able values), doing longest-prefix matching (`walkDirectoryDoc`, lines 80-89) and materializing content with MIME-aware encoding (`materialize`, lines 95-153). Copy tracking is via `HasPatchworkMetadata.copies`/`copyOf` (`metadata.ts:10,48-53`), and `getSuggestedImportUrl` (`metadata.ts:37-46`) lets a document point at the module (HTTP or `automerge:`) that can render it — this is how the "no tool found → auto-install the suggested module" flow in `legacy-impl.ts` (`#notool`, lines 828-853) works.

**Versioning/branching/history.** This particular snapshot is **thin** on Patchwork's famous git-like branching:

- `HasPatchworkMetadata.history?: AutomergeUrl` exists as a metadata field (`metadata.ts:13`) but is not read/written anywhere in this repo's source.
- `BranchesDoc = HasPatchworkMetadata<"branches"> & { branches: { [name]: AutomergeUrl } }` (`core/filesystem/src/types.ts:12-14`) exists as a type, and `ModuleWatcher.processModuleEntry` (`module-watcher.ts:210-241`) still special-cases it for _modules_ — but only to warn it's deprecated (`warnBranchesUnsupported`, lines 81-85: "Branches docs are no longer supported as modules; falling back to the 'default' branch") and fall through to that one named branch. So doc-level branching as a first-class UI feature is **not implemented in this repo** — it likely lives in the external frame/tools repo, or was retired/relocated. Versioning that _is_ implemented here is narrower: heads-pinning (`handle.view(heads).url`, used pervasively for reproducible module imports) and `copies`/`copyOf` (document duplication, not branching per se). The `OverlayRepo`/`OverlayHandle` remapping mechanism (§6) is the actual mechanism that could back "draft"/"branch" UX (a view can be transparently redirected to a `cloneUrl` fork of the doc it asked for), but the branching _policy_ (create a fork, merge back) is not present in this repo — it's a hook other code (the external frame) would drive by answering `repo:handle-descriptor`.

**Filesystem abstraction (`core/filesystem`)** — summarized: `types.ts` (FolderDoc/DocLink/UnixFileEntry), `metadata.ts` (`@patchwork` metadata helpers), `packages.ts` (Automerge-doc-as-npm-package import machinery), `resolve.ts` (path resolution/materialization across both folder shapes), `find-handle.ts` (name-path walking), `module-watcher.ts` (live module-list watching), `urls.ts` (Automerge URL ↔ service-worker-servable HTTP URL conversion, e.g. `getImportableUrlFromAutomergeUrl`, `urls.ts:18-26`).

## 5. UI composition

**`<patchwork-view>`** (`core/elements/src/patchwork-view.ts`) is the single custom element the whole UI is built from — a discriminated union based on attributes:

- `component` attribute set → **component mode**: looks up a `patchwork:component` plugin by id in the registry, waits for load, then calls `component(this, params.repo)` (the _base_ repo, not the overlay — see §6) and expects a cleanup function back (`#renderComponent`, lines 551-604).
- `doc-url`/`tool-id` attributes, no `component` → **legacy mode**: delegates to `LegacyImpl` (`core/elements/src/legacy-impl.ts`), which resolves the doc via `repo.find(docUrl)`, determines its datatype (`getType(doc)`), picks a tool (`getFallbackTool`/explicit `tool-id`), and calls `tool.module(handle, contentElement)` (`legacy-impl.ts:656-666`) — `ToolElement` is just `HTMLElement & { repo, hive? }`. This is the tool-selection logic answering "how does a frame choose which tool renders which datatype": exact `supportedDatatypes` match wins over `"*"` wildcard (`sortPlugins`, `tools.ts:85-131`), and a wildcard match renders as a visible "fallback"/stopgap state while a suggested import loads a better one.
- Both modes are lifecycle-managed with an explicit state machine (`none → initializing → rendering → unable/rendered/error`), epoch counters to guard against races (attribute changes mid-load), and Keyhive access-gating (`bestAccessForDoc`) before rendering when a Keyhive instance is present, with automatic retry on `"ingest-remote"` sync events.
- Dispatches `patchwork:mounted`/`patchwork:unmounted` CustomEvents (`core/elements/src/events.ts:20-43`), which the router (§below) and other listeners use to know when a view is live.
- No React/Solid dependency at the element level — `core/elements`' `package.json` lists `react`/`solid-js` only as _optional_ peerDependencies, used solely for ambient JSX typing of the `patchwork-view` intrinsic element (`core/elements/src/index.ts:11-60`), not for rendering. React/Solid are consumer-side conveniences (see `packages/providers/frameworks/{react,solid}`), not implementation dependencies of the shell.

**Slot/surface-like mechanism** — there isn't a slot system in the Composer/DXOS sense. Instead: (a) tools/components are plain functions writing DOM nodes into the element they're handed, and (b) cross-boundary service resolution is done via the DOM-event provider protocol (§6), which functions as a poor-man's "surface" for anything that isn't document rendering (comments, presence, handle-descriptor remapping, etc.) — a producer anywhere in the ancestor tree can `accept()` a `patchwork:subscribe` for a typed `selector`.

**Router** (`core/patchwork/src/router.ts:74-195`) drives the single root `<patchwork-view>` from `location.hash`, supporting `#doc=<automergeUrl>&tool=<id>&type=<datatype>&title=<t>&frame=<toolId>` and legacy `<slug>--<docId>` links; `patchwork:open-document` events (dispatched by tools wanting to navigate, or by `patchwork.open()`) update the hash and, incidentally, the page `<title>` via the resolved datatype's `getTitle`.

## 6. Services / capability injection

There is **no dependency-injection container**. Two complementary mechanisms carry shared services:

1. **Direct threading at boot**: `repo`/`hive` are constructed once in `setup()` and passed by parameter into `registerPatchworkViewElement({ hive, repo })` (`core/patchwork/src/index.ts:207`) and `registerRepoProviderElement(repo)` (`index.ts:189`) — every `<patchwork-view>` instance closes over these via the class's constructor-captured `params`. Tools/components receive `repo` as a function argument (`ToolElement.repo`, `ComponentRender`'s second arg), never via context/hooks.

2. **DOM-event request/response protocol** (`packages/providers/core/src/index.ts`) — this is the real "capability injection" layer, and it is explicitly generic/typed by a JSON `Selector = { type: string, ...args }`:
   - `subscribe(element, selector, listener)` (`index.ts:77-120`) dispatches a bubbling, composed `patchwork:subscribe` CustomEvent carrying a fresh `MessageChannel` port; it walks up to the nearest `<patchwork-view>` ancestor first (`viewTags`) so subscriptions cross into ancestor scopes/iframes cleanly.
   - `accept(event, producer)` (`index.ts:136-170`) is what an ancestor provider calls to answer: it `stopPropagation()`s (first-claim wins), and can `respond()` any number of times (streaming) with optional `Transferable`s.
   - `request(element, selector)` (`index.ts:179-191`) is the one-shot convenience wrapper.
   - **`<repo-provider>`** (`packages/providers/core/src/repo-provider.ts`) is the root-level fallback answerer for the `"repo:handle-descriptor"` selector — it just echoes back `{ url }` (no remapping) so any view without a nearer remapper still resolves.
   - **`OverlayRepo`** (`packages/providers/core/src/overlay-repo.ts`) is a per-`<patchwork-view>` `RepoLike` shim: its `find`/`findWithProgress` ask (via the provider protocol) "what document should I actually read for this url?", and a nearer ancestor can answer with a `cloneUrl` (a fork of the requested doc) — the presented identity (url) is preserved via `OverlayHandle` while reads/writes go to the substituted document. This is the mechanism a "draft" or workspace-overlay feature would use to transparently redirect resolution — invariant: `cloneUrl` MUST be a fork sharing `url`'s history (`overlay-repo.ts:26-32`).
   - `RepoLike` (`packages/providers/core/src/types.ts:22-28`) is the minimal surface (`find`, `findWithProgress`, `create`, `create2`, `handles`) both the real `Repo` and any overlay must satisfy, so hook libraries (`automerge-repo-react-hooks`, `-solid-primitives`) work against either transparently.
   - React (`packages/providers/frameworks/react/src/index.ts`) and Solid (`.../solid/src/index.ts`) packages are thin hook wrappers over this protocol (`useRequest`, `useSubscribe`, `useSubscribeDoc`), not separate DI systems.

**What core forces vs. leaves open**: Core forces the shape of a plugin (`{id, type, name}` + `load`/`import`), the `@patchwork` metadata envelope, and the request/subscribe event contract. It deliberately does **not** force: how a tool renders (any DOM manipulation — React/Solid/vanilla all equally valid), what a datatype's doc shape looks like beyond the metadata envelope, whether/how documents are validated, or any particular state-management library. This is consistent with an explicit "low-level, bring-your-own-everything" design (see §9).

## 7. Sync / networking / identity

- **Transport**: `@automerge/automerge-subduction` — Ink & Switch's own sync protocol/server (distinct from "classic" automerge-repo sync). `DEFAULT_SYNC_SERVERS` (`core/patchwork/src/site-kit/sync-servers.ts:8-12`): `classic: wss://sync3.automerge.org`, `subduction: wss://subduction.sync.inkandswitch.com`, `keyhive: wss://keyhive.sync.automerge.org`. A site can also `connectClassicSync(server)` on demand for the legacy channel (`core/bootloader/src/setup.ts:412-440`).
- **Where sync actually runs**: only the SharedWorker (`core/bootloader/src/automerge-worker.ts`) holds live WebSocket/Subduction connections; tabs talk to it exclusively over `MessageChannel`/`BroadcastChannel`, so multiple tabs share one sync session and one IndexedDB (`IndexedDBWorkerStorageAdapter`).
- **Identity model — two tiers**:
  1. Plain-repo mode: a `MemorySigner` (tab) / `WebCryptoSigner` (SharedWorker) produces a `peerId` + `verifyingKey` (hex Ed25519) — exposed as `SignerIdentity` on `window.patchwork.signer` (`core/patchwork/src/repo.ts:85-105`; `core/bootloader/src/automerge-worker.ts:261-283`). `sharePolicy` narrowly restricts what a tab-local repo will sync directly (only the worker/storage-server peers), pushing all real network sync into the worker.
  2. **Keyhive mode** (`syncServer.keyhive` configured): `initializeAutomergeRepoKeyhiveWithRepo`/`...RustWithRepo` (wasm-backed) builds a repo with access-control semantics — `hive.bestAccessForDoc(individualId, docUrl)` gates rendering in both `patchwork-view.ts` (lines 315-352) and `legacy-impl.ts` (lines 285-322): a view sits in `"unable"` state until access data syncs (`"ingest-remote"` event triggers re-check), distinguishing "doc not synced" from "no access" (`accessLevel === "None"`).
- **`packages/edge-handles`** — not a sync/networking package per se, but a general "doc-backed reactive cell with named upstream/downstream connections" dataflow primitive built directly on `automerge-repo` handles; ships a DOM bridge (`./dom` subpath) and documents strong invariants (handle addressability, resolution retries, referential equality while live, GC via `WeakRef`/`FinalizationRegistry`, cycle-safety via a re-entrancy guard). Reference transforms (sum, template, markdown, color conversion) are explicitly **not** shipped in the SDK — kept in an external `tools/edge-handles` package to keep the SDK minimal. Quote: "EdgeHandles are deliberately not transformers. They are the shared primitive on which transformers, propagators, and other dataflow systems can be built" (README).

## 8. Sites

- A **site** = a Vite app whose `vite.config.ts` uses `patchwork()` from `@inkandswitch/patchwork/vite` (`core/patchwork/src/vite/patchwork-plugin.ts:33-44`), which composes: `wasm()` (vite-plugin-wasm), `configPlugin` (server/preview/worker/build/`__SITE_NAME__`/`__SYNC_SERVER__` defines), `iconsPlugin` (renders an icon set from one source image via `sharp`), `htmlPlugin` (generates `index.html`), `manifestPlugin` (`manifest.webmanifest`), `netlifyPlugin` (`_headers`/`_redirects`, immutable-asset caching), `importmap` (injects the bootloader's externals into an import map so dynamically-loaded modules share singletons), `serviceworker` (emits `/service-worker.js`, `/automerge-worker.js`). The bundler-agnostic pieces (icon rendering, HTML/manifest/Netlify text builders) live in `core/patchwork/src/site-kit/*` with zero vite import, explicitly reusable by another bundler adapter (docblock, `patchwork-plugin.ts:12-31`).
- **`sites/gaios.sgai.uk`** is the one concrete example in this repo: `vite.config.ts` calls `patchwork({ siteName: "gaios", title: "GAIOS", description: "local-first collaborative & malleable software environment", icons: {source: "public/gaios.png"}, ... })`; `src/main.ts` calls `setup({ packageListURL, accountKey: "gaiosAccountUrl", name: "GAIOS" })` where `packageListURL` is a hardcoded `automerge:3XRXFS96oVXe5D4joMyQWAfNeFNN` module-settings doc (overridable via `?system-package-list=` query param or `localStorage.systemPackageListURL`) — comment notes it's "registered… via `pnpm register` from each tool's own repo (see patchwork-tools and patchwork-core)" (`main.ts:8-11`), confirming the tools themselves are published from external repos. It also has a `sync: "vite build && pushwork sync"` script, i.e. the site's own static assets can be published _into_ Automerge via `pushwork` too.
- **`patchwork.inkandswitch.com`** is referenced only indirectly: `packages/e2e/README.md` describes running the e2e suite "against a real Chromium … a built `patchwork.inkandswitch.com`," and CI dispatches a `core-main` event to `repos/inkandswitch/patchwork.inkandswitch.com` on every green build (`ci.yml:23-30`) — it's evidently a separate repo/site consuming this core, not present here.

## 9. Design philosophy

Explicit statements found in code comments (no dedicated philosophy doc/README section exists):

- Package docstring, `core/patchwork/src/index.ts:1-19`: bootloader is scoped to "non-UI consumers" and does "SW registration and the automerge-worker handoff and nothing else" — a conscious layering of mechanism (bootloader) vs. policy (patchwork/elements/plugins).
- `edge-handles` README: "EdgeHandles are deliberately **not** transformers… the shared primitive on which transformers, propagators, and other dataflow systems can be built," and reference implementations are "kept out of the SDK so consumers ship only what they need" — a repeated pattern of shipping the minimal mechanism and leaving policy/convenience to userland or sibling repos.
- `core/patchwork/src/vite/patchwork-plugin.ts:28-31`: the non-vite logic is factored into `site-kit` "reused by a different bundler adapter" — bundler-agnosticism by design.
- `PluginRegistry`'s doc comment on `RegistryTypeMap` (`core/plugins/src/registry/types.ts:11-19`): "can be extended with `declare module … { ... }` to add new registry types in userland" — the plugin _type_ namespace itself (`patchwork:tool`, `patchwork:datatype`, `patchwork:component`, …) is open-ended, not a closed enum; userland can register wholly new plugin categories with zero core changes (`getRegistry(type)` lazily creates any string-keyed registry).
- The Tool/Component render contract being "a function that takes an `HTMLElement`, returns a cleanup" (no framework mandated) and the optional-peerDependency treatment of React/Solid at the `core/elements` layer is the strongest "universality of modules" signal: any renderer technology can implement a tool as long as it satisfies that one function shape.
- The e2e README explicitly names `install-tool.spec.ts` "the extensibility loop" — treating live, in-browser, no-rebuild package installation as a first-class product guarantee, not an edge case.

Overall stance: **low-level and unopinionated at the rendering/state layer** (no schema validation, no mandated UI framework, plugin categories are open-ended strings), but **fairly opinionated about document identity and transport** (every doc must carry `@patchwork` metadata to be nameable/routable; sync is Subduction/Keyhive-specific; the SharedWorker+ServiceWorker dual-worker boot architecture is fixed, not swappable).

## 10. Maturity signals

- **Versions**: `core/plugins@1.1.0`, `core/elements@5.0.0`, `core/bootloader@0.5.3`, `core/patchwork@0.3.2`, `core/filesystem@0.2.5`, `packages/edge-handles@0.1.2`, `packages/providers/core@0.4.2` — pre-1.0 across the board except `elements`/`plugins`, and `AGENTS.md` states "everything here is pre-1.0" for changeset bump-level guidance.
- **TODOs**: only ~9 `TODO`/`FIXME` comments across `core`+`packages` (e.g. `core/plugins/src/registry/index.ts:32-52` — an explicit "ugly and transitional" migration shim renaming `patchwork:dataType`→`patchwork:datatype`; `core/filesystem/src/module-watcher.ts:335-337` admits its module-URL-to-doc-watch heuristic "relies on a bunch of heuristics"). Low absolute count, but several are candid admissions of known hacks.
- **Tests**: Vitest tests exist for the trickiest concurrency-sensitive pieces — `core/elements/test/patchwork-view.test.ts`, `core/filesystem/test/{find-availability,module-watcher,subduction-sync}.test.ts` (the last hits the **real** production Subduction server and asserts all 26 tool folder docs are retrievable — a live-infrastructure smoke test embedded in the suite), `packages/edge-handles/test/edge-handle.test.ts`. `core/plugins` has **no test script**.
- **E2E**: a dedicated Playwright package (`packages/e2e`) self-describes its current scope as **"Stage B1"** (SW relay + IndexedDB only, no external Subduction in most specs) with "Stage B3" future work explicitly called out (README lines 85-137). It documents a **known, unresolved flake**: "roughly once per full run, a cross-tab `repo.find()` for a just-created doc wedges permanently" (README lines 127-131), mitigated with retries rather than fixed. It also documents deliberate cross-browser limitations (Firefox/WebKit skipped for two specs due to real engine bugs around service-worker CORS/timing).
- **API stability**: several deprecated-but-kept-working shims are visible (`supportedDataTypes`→`supportedDatatypes`, `patchwork:dataType`→`patchwork:datatype`, `docHandleToServiceWorkerUrl`→`getImportableUrlFromDocHandle`, branches-doc-as-module deprecation with a runtime warning) — consistent with an API still settling, prioritizing non-breaking migration paths (warn once, keep working) over hard cuts.
- **CI**: single `ci.yml` workflow (build all + `pnpm test`) plus `preview.yml`/`release.yml` (changesets-based publish). No lint/typecheck job visible in `ci.yml` beyond `pnpm build` (which runs `tsc`).
