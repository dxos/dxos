# Patchwork ↔ DXOS: comparative analysis

Comparison of the Ink & Switch [Patchwork System](https://github.com/inkandswitch/patchwork-system)
(at commit `9473392`, 2026-07-24) with the systems used to build Composer:
`@dxos/app-framework`, `@dxos/app-toolkit`, and ECHO. The question examined: how
do the two stacks solve the same problems differently, where do they conflict,
where do they complement each other — and is there a viable path where a
refactored `@dxos/app-framework` runs *on* a Patchwork-style substrate, with the
DXOS capability/schema system as "one strong opinion" layered on top (the
zsh / oh-my-zsh framing)?

Detailed per-system architecture reports (with `path:line` citations) are in:

- [`patchwork-architecture.md`](./patchwork-architecture.md)
- [`app-framework-architecture.md`](./app-framework-architecture.md)
- [`echo-architecture.md`](./echo-architecture.md)

## Executive summary

1. **The two stacks already share their sync substrate — literally.** DXOS pins
   `@automerge/automerge-repo@2.6.0-subduction.40` +
   `@automerge/automerge-subduction@0.16.0` (with two local patches);
   Patchwork pins `2.6.0-subduction.46` + the identical
   `@automerge/automerge-subduction@0.16.0`. Both are consumers of Ink &
   Switch's Subduction ("sedimentree") fork of automerge-repo, six patch
   releases apart. Wire-level interop is not hypothetical; it is the current
   default.
2. **The overlap — and therefore the conflict — is not at the app-framework
   layer, it is at the kernel-services layer.** Patchwork core and the DXOS
   platform each own a module loader, a document-metadata convention, a
   worker topology that holds the repo, and an access-control system. Those
   four things are where the systems compete. The plugin/capability/Surface
   machinery of `@dxos/app-framework` competes with almost nothing in
   Patchwork core, because Patchwork deliberately doesn't have those layers.
3. **The zsh/oh-my-zsh framing is half right.** Right: Patchwork's extension
   surface is genuinely minimal and open-ended (plugin *types* are userland-
   extensible strings; no schema system, no mandated UI framework, no DI
   container), and it explicitly invites opinionated layers on top — DXOS's
   capability/schema/operations stack is exactly the shape of thing it
   invites. Wrong: oh-my-zsh has no kernel of its own, whereas DXOS ships a
   competing kernel (module loading, doc conventions, identity, worker/repo
   ownership). Today the honest analogy is *two distros sharing one kernel
   (automerge + Subduction) with different init systems and package
   managers*. Becoming "oh-my-patchwork" is possible precisely because
   `app-framework`'s core has zero ECHO coupling — but it requires bridging
   at the four kernel-services seams, not just the plugin layer.
4. **Recommended path: adapters and staged experiments, not a bet-the-kernel
   refactor.** Patchwork is pre-1.0 across the board, its module namespace is
   unversioned, its famous branching feature is *not* in this repo (only the
   `OverlayRepo` mechanism that could host it), and Keyhive is alpha.
   Meanwhile several refactors that a Patchwork convergence would need are
   worth doing on their own merits (extracting operations/process-manager
   from the app-framework kernel; keeping the non-React Surface path
   healthy). Three cheap experiments (§6) would produce real interop signal
   without committing either architecture.

## 1. Side-by-side

| Problem | Patchwork System | DXOS (app-framework / app-toolkit / ECHO) |
| --- | --- | --- |
| Unit of extension | `LoadablePlugin` `{id, type, name, load()/import}` in open-ended string-keyed registries (`patchwork:tool`, `patchwork:datatype`, `patchwork:component`, userland types via `declare module`) | `PluginModule` `{id, activatesOn, activate: Effect → Capability[]}` grouped into `Plugin`s with meta/profile; capabilities are phantom-typed NSID handles |
| Activation/ordering | None — registries are load-on-demand; consumers `await loadWhenReady(id)`; no dependency graph between modules | Activation-event DAG (`activatesOn` / `firesBefore` / `firesAfter`, `oneOf`/`allOf`), topological `enable()` over `dependsOn`, timeouts, auto-disable on failure |
| Choosing a renderer for data | Doc's `@patchwork.type` string → tool whose `supportedDatatypes` matches (exact beats `"*"` wildcard); fallback tool renders while `suggestedImportUrl` auto-installs a better one | `<Surface type={Role} data={…}>` → position-sorted candidates filtered by per-definition data guards (commonly ECHO-schema `instanceOf`); `limit`, error boundaries, per-role atom subscription |
| Render contract | `(handle: DocHandle, element: HTMLElement) => cleanup` — framework-agnostic DOM function; React/Solid are optional peer deps only | React component (primary) or web component (`kind: 'web-component'`); React, `@dxos/react-ui` are hard deps of app-framework |
| Data typing | Duck typing. `@patchwork.type` discriminant + datatype `init(doc, repo)`; no validation, no versioning | Effect Schema classes with DXN typename + semver, annotations (label/icon/form/graph), stored schemas-as-data, explicit `Migration.define` |
| Document identity | `AutomergeUrl` is the universal address — for data *and code*; folder docs are npm-shaped packages served by the service worker | `echo://<spaceId>/<objectId>` EIDs + `dxn:` type URIs; space root `DatabaseDirectory` manifest maps object id → automerge doc URL |
| Links | `DocLink {name, type, url: AutomergeUrl}` in folder docs | IPLD-style `{'/': uri}` `EncodedReference`; `Ref<T>` with tiered sync/async resolution |
| Service injection | DOM-event request/subscribe protocol (`patchwork:subscribe` + MessageChannel), spatially scoped by DOM ancestry, first-claim-wins; `OverlayRepo` remaps doc resolution per subtree | `CapabilityManager` — app-global, typed, reactive (Effect-Atom); `Capability.get/getAll/waitFor/atom`, Effect `Layer` bridging |
| Dynamic module loading | Radical: modules live *in Automerge docs*, heads-pinned imports via service-worker-served virtual packages; live reload on doc change; worker-isolated discovery | Production: compile-time lazy chunks + URL-installed remote plugins (persisted, offline-cached) + EDGE registry catalog with dependency auto-install |
| Repo ownership | SharedWorker owns the `Repo`, storage (IndexedDB) and sync sockets; tabs attach via MessageChannel; service worker serves `automerge:` fetches | Client-services worker/agent owns `AutomergeHost` (SQLite storage); tabs use `RepoProxy` RPC — never a local `Repo` |
| Sync transport | Subduction (`wss://subduction.sync.inkandswitch.com`), classic automerge-repo sync as fallback | Same Subduction packages via EDGE websocket; MESH (WebRTC/teleport) P2P as second replicator behind one `EchoNetworkAdapter` |
| Access control / identity | Keyhive (wasm, alpha): `bestAccessForDoc(individualId, docUrl)` gates rendering & sync; Ed25519 signer identity | HALO: feed-based verifiable credentials, device delegation chains, space membership/invitations; `SubductionPolicy` 4-hook authorization at the transport |
| History / branching | Heads-pinning (`handle.view(heads)`) everywhere; `copies`/`copyOf`; `OverlayRepo` clone-remapping as the *mechanism* for drafts — branching *policy* lives outside this repo (deprecated as a module concept) | Full stack: `A.getHistory`/`A.diff` timelines, `checkoutVersion`, `SpaceBranchRegistry` in the space doc, `forkDump` ancestry-preserving forks, device-local branch selection, `plugin-versioning` UI |
| Actions/undo, settings, i18n, nav graph, queries/index | Absent by design — left to tools/userland | Operations + process manager + undo registry; Settings/Translations capabilities; AppGraph; SQLite FTS/ref indexes + live queries |

## 2. Convergences — same problem, same instinct

These are the places where the teams independently (or through shared
automerge-community lineage) landed on the same design:

- **Get the repo out of the tab.** Both architectures decided the tab must not
  own the CRDT store: Patchwork via SharedWorker + BroadcastChannel handoff +
  dead-worker resurrection; DXOS via client-services worker + `RepoProxy`
  RPC. Same motive (one sync session, one store, N tabs), different protocol.
- **Discovery/load split for untrusted or heavy modules.** Patchwork imports
  a module in a throwaway Worker just to read its `plugins` array, then
  re-imports on the main thread only when a plugin is actually used. DXOS
  splits `Plugin.lazy` meta from module chunks and caps loads with timeouts +
  auto-disable. Both treat "list what you offer" as cheap and "run your code"
  as deferred.
- **Type-tag-in-the-doc drives rendering.** `@patchwork.type` and ECHO's
  `system.type` DXN are the same move: a discriminant stored in the document
  itself, resolved against a registry of renderers at view time — including a
  degraded/fallback state while the right renderer loads.
- **Code and its registry are themselves sync'd data.** Patchwork's
  `ModuleSettingsDoc` + folder-docs-as-npm-packages is the purest version;
  Composer's EDGE plugin registry + `TODO(burdon): Convert [Plugin] to ECHO
  schema` (`plugin.ts:244`) shows DXOS heading the same direction
  ("plugins-as-data").
- **Overlay/fork as the draft primitive.** Patchwork's `OverlayRepo`
  (resolution remapped to a `cloneUrl` fork that must share history) and
  ECHO's `forkDump` (ancestry-preserving change replay so a later
  `A.merge` is a true 3-way merge) encode the identical invariant: a branch
  is only useful if it stays merge-compatible with its origin.

## 3. Divergences — same problem, opposite bet

- **Schema: duck typing vs. typed contracts.** Patchwork validates nothing
  after `init()`; the doc's shape is a social contract between tools. ECHO
  bets the opposite way: Effect Schema with versioned typenames, annotations
  that drive UI (labels, icons, forms, graph behavior), stored schemas, and
  explicit migrations. This is the clearest "Patchwork leaves open what DXOS
  opinionates" axis — and the core of the oh-my-zsh thesis.
- **Service scope: spatial vs. global.** Patchwork's provider protocol scopes
  services by DOM ancestry — a nested view can live inside a different
  "draft world" because a nearer ancestor answers `repo:handle-descriptor`
  differently. DXOS capabilities are app-global with module identity;
  scoping is done in data (which space, which subject) rather than in the
  tree. Patchwork's model composes nested contexts for free (iframes,
  embedded views); DXOS's model gives typed discovery, reactive collections,
  and lifecycle/teardown. These aren't incompatible — a bridge could expose
  capabilities *as* providers and vice versa — but they reflect different
  ideas of where composition happens.
- **Addressing: URL-first vs. space-first.** In Patchwork any doc (including
  a module) is directly addressable and shareable by `AutomergeUrl`; there is
  no mandatory container. In ECHO the space is the unit of replication,
  membership and indexing, and objects are addressed through it (with the
  `DatabaseDirectory` manifest as the join point). Consequence: Patchwork
  gets frictionless "paste a URL, get the doc" sharing but leaves collection
  semantics to convention (folder docs); ECHO gets queries, membership and
  epoch compaction but pays a manifest/indirection layer, and cross-space
  refs are still only opportunistically resolved.
- **Access control: object-capability vs. credential-chain.** Keyhive gates
  per-doc access levels checked at render/sync time; HALO issues verifiable
  credentials with device delegation chains, checked at replication and
  membership. Both are bolted onto the same Subduction transport at
  different hooks (Keyhive inside the forked repo; DXOS via
  `SubductionPolicy`). This is the one seam where the systems genuinely
  contend for the same slot and one must yield per deployment.
- **Kernel scope.** Patchwork core ships mechanism only and pushes policy to
  sibling repos (the frame, the tools, even reference edge-handle
  transforms). app-framework bundles operations/process-manager/undo and
  the remote-registry machinery into the kernel package itself — its own
  report flags this as the biggest "not actually a pure kernel" data point.

## 4. Conflicts — what a merged world would have to resolve

1. **Two module systems.** A Patchwork module (`plugins` export, registry
   types, Automerge-hosted packages) and a DXOS plugin (`Plugin.lazy`,
   activation events, EDGE registry with provenance) are mutually invisible.
   Patchwork's has no version/dependency model (id collision = warn and
   overwrite); DXOS's is more mature here (semver profiles, dependency
   closure, auto-install). A shim in either direction is straightforward
   (§6); *unifying* them means picking one loader and one manifest.
2. **Two document ontologies.** `@patchwork` envelope + `DocLink{url}` vs.
   `DatabaseDirectory`/`EntityStructure` + `{'/': echo-uri}`. The formats
   don't collide key-wise — an ECHO per-object doc *could* also carry an
   `@patchwork` envelope — but neither runtime maintains the other's fields,
   link graphs don't translate, and Patchwork tools expect the *whole doc*
   to be theirs while ECHO objects namespace user data under `data`.
3. **Two repo owners.** Each stack assumes it constructs the (patched!)
   `Repo` inside its own worker with its own storage adapter. Running both
   in one page today yields two disjoint stores. Convergence requires one
   side to accept the other's repo: Patchwork's seam is `RepoLike` (already
   designed for substitution); DXOS's seam is `AutomergeHost`'s
   storage/network adapters (standard automerge-repo interfaces). The
   version skew (subduction.40+patches vs .46) is small but real — DXOS's
   patches would need upstreaming or re-pinning.
4. **Keyhive vs. HALO** (§3). Not bridgeable by shims; a real convergence
   either runs HALO policy inside `SubductionPolicy` against Keyhive-less
   sync (status quo), adopts Keyhive and maps HALO credentials onto it, or
   scopes each to different deployments.

## 5. Complementarity — the oh-my-zsh thesis, assessed

What makes the thesis credible:

- Patchwork explicitly leaves open exactly what DXOS has built: schema and
  validation, typed capability discovery, an action/undo system, settings,
  i18n, navigation graph, queries/indexing, schema-driven forms. Its plugin
  *type* namespace is designed for userland extension — `patchwork:capability`
  or `patchwork:schema` registries are legal today with zero core changes.
- `app-framework`'s kernel (Plugin/Capability/PluginManager/ActivationEvent,
  Surface dispatch) has **zero ECHO/client coupling** — verified against its
  dependency graph. It could boot inside a Patchwork site and render into a
  `patchwork:component` element unchanged.
- ECHO's schema/query layer is **separable from HALO and Subduction** — DXOS's
  own test builder runs the full schema/query/db stack with no identity or
  policy layer. Pointing it at another automerge-repo `Repo` is an adapter
  problem, not a rewrite.
- The value proposition is genuine in both directions: Patchwork gets a
  mature typed-app layer (the thing every Patchwork tool currently
  hand-rolls); DXOS gets Patchwork's radical distribution story (tools and
  data in the same synced substrate, heads-pinned reproducible imports,
  in-browser install loop as a product guarantee) — which is further along
  than Composer's registry in exactly the dimension Composer's `TODO:
  plugins as ECHO data` points at.

What limits it:

- oh-my-zsh doesn't ship its own shell. DXOS does: ECHO's space manifest,
  HALO, the client-services worker, and the EDGE registry are kernel-level
  services that overlap Patchwork core rather than layering on it. "DXOS as
  distribution" means demoting or adapting those — a much bigger decision
  than anything in `app-framework` itself, and one that trades away
  spaces/membership/queries unless re-implemented over Patchwork
  conventions.
- Patchwork's maturity: pre-1.0 everywhere, candid known-hack comments, a
  documented unresolved cross-tab flake, branching policy absent from core,
  Keyhive alpha, live-infrastructure tests. It is an excellent research
  substrate and a risky foundation.
- A closer analogy than zsh/oh-my-zsh: **Patchwork core is a microkernel +
  package manager; DXOS app-framework + app-toolkit + ECHO is a full OS
  userland with its own (heavier) kernel.** The productive move is making
  the userland portable across kernels — which the app-framework/app-toolkit
  split has already half-done — rather than declaring one kernel the winner.

## 6. A staged path (cheap experiments first)

Refactors worth doing regardless of Patchwork (they also serve the thesis):

- **Extract operations/process-manager (and the registry client) from the
  app-framework kernel** into opt-in packages, making the kernel the pure
  Plugin/Capability/Surface core its own layering already implies.
- **Keep the non-React Surface path first-class** (web components), since any
  Patchwork hosting scenario makes React an implementation detail of one
  module among many.
- **Parameterize app-toolkit's data assumptions** behind a narrow interface
  (roughly Patchwork's `RepoLike` plus type registry) instead of importing
  `@dxos/client` directly, so the opinionated layer can sit on either data
  kernel.

Experiments, in order of increasing commitment:

1. **Composer-in-Patchwork smoke test.** Ship a Patchwork module whose
   `patchwork:component` boots a minimal `PluginManager` with 2–3 plugins
   and renders a `<Surface>` tree into the provided element. Proves kernel
   portability; touches no data bridging. (Effort: small; one shim package.)
2. **Schema→datatype adapter.** A generator that turns
   `AppCapabilities.Schema` + `ReactSurface` contributions into
   `patchwork:datatype` (`init` from schema defaults, `getTitle` from
   `LabelAnnotation`) + `patchwork:tool` descriptors. This is literally
   "the DXOS schema system as one strong opinion on Patchwork" and makes
   every Composer content plugin a candidate Patchwork tool.
3. **ECHO-on-foreign-repo spike.** Stand up ECHO's HALO-less test stack
   against a repo constructed by Patchwork's bootloader (aligning the
   subduction pin, upstreaming DXOS's two patches). Success criterion: `Obj`
   CRUD + live query over docs that Patchwork tools can simultaneously open
   by `AutomergeUrl`.
4. **Ref/URL interop.** Teach `Ref` to hold `automerge:` URLs as first-class
   targets (and emit `@patchwork.type` on export), so documents can be
   linked across ontologies without converting them.
5. **Upstream conversations** where shims can't help: link encoding
   (`{'/': uri}` vs `DocLink`), metadata-envelope co-existence, module
   manifest shape, and the Keyhive/HALO question. The shared Subduction
   dependency means both teams already meet in the same upstream — that is
   the natural venue.

## 7. Bottom line

The systems conflict least where one might expect (plugin/UI frameworks) and
most at the substrate services (module loading, doc ontology, repo ownership,
access control) — while already standing on the *same* forked sync stack. The
oh-my-zsh outcome is architecturally reachable because DXOS has already
factored its opinionated layers away from both its kernel and its data engine;
it is strategically premature to commit to, because Patchwork's kernel is
pre-1.0 and thinner than what Composer relies on today (no module versioning,
no membership/query model, branching policy external). The staged experiments
in §6 buy real interop evidence at shim cost, keep DXOS's options open, and
would surface — early and concretely — the two questions that actually decide
the thesis: whose repo, and whose access control.
