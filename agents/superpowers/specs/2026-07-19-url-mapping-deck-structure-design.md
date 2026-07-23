# URL mapping & deck structure — pair-chain URLs, graph-builder resolution, single-mode deck

Date: 2026-07-19
Status: approved design — ready for phased implementation

## Problem

URLs today are a mix of two incompatible shapes. Solo mode encodes a full app-graph
path in the pathname (e.g. `/<spaceId>/system/database/<typename>/<objId>`); multi
mode instead stuffs the deck state into a `?plank=` query param. Neither shape can
represent fullscreen or companions, and a deep-linked object always forces solo mode
regardless of what the user was doing before — there is no way to deep-link into an
existing multi-plank deck. The URL grammar is owned by
`packages/plugins/plugin-deck/src/capabilities/url-handler.ts`, with
`packages/sdk/app-toolkit/src/app/Paths.ts` (`toUrlPath`/`fromUrlPath`) as the
nominal grammar authority; mobile runs a parallel, independently-maintained handler
in plugin-simple-layout.

Path resolution is a similar accretion of workarounds. The graph builder's native
`ResolverExtension` (id → node) was disabled once node ids became path-qualified —
see the `TODO(graph-path-ids)` markers in `plugin-space`'s `collections.ts:180` and
`spaces.ts:246` — and never replaced. In its place, the `NavigationPathResolver`
capability was bolted on to do deep-link validation and DXN dedup, and is now
contributed by seven plugins (space, inbox, thread, assistant, brain, routine,
magazine): the same "how do I find this node" knowledge, duplicated per plugin,
outside the graph builder that already has it. `packages/sdk/app-toolkit/src/app-graph/TypeSection.ts`
shows the pattern at its worst: a connector (`createTypeSectionExtension`) and a
path resolver (`createTypeSectionPathResolver`) are coupled only by documented
convention — the same static knowledge (how TypeSection paths are shaped) is
expressed twice, in two different APIs, with no compiler-enforced link between them.

Deck modes compound the problem on the presentation side: `multi | solo |
solo--fullscreen` are user-toggled state with revert bookkeeping (`previousMode`), a
forced-solo rule for deep links, and no modifier-key navigation affordance. (This is
presentation, not URL grammar or resolution, and is covered in the second half of
this spec — noted here only as part of the motivation.)

The intended outcome of this design: compact, Macro-style URLs built from a chained
sequence of `(prefix, id)` pairs that resolve through the graph builder itself —
dissolving `NavigationPathResolver` entirely — plus a single deck mode whose
presentation derives purely from plank count.

## URL grammar

```
url-path   = "/w/" workspace *( "/" pair )
workspace  = space-id | pinned-name       ; e.g. B2AK… or !dxos:settings
pair       = ws-pair | node-pair
ws-pair    = "w" "/" workspace            ; rebases all subsequent ids onto this workspace
node-pair  = prefix [ "/" id ]
prefix     = registered, extension-owned key (doc, collection, database, mail, comments, …)
id         = entity-id                    ; always relative to the current workspace base
```

Parsing is registry-driven: every segment after the leading `w` pair must be a
registered prefix key. Whether a key consumes a following id segment is a property
of its registration, not of the parser — a plank-opening key like `doc` always takes
an id; a companion key like `comments` never does. A node pair whose key opens a
plank starts a new plank; a companion key instead attaches to the _preceding_
plank's node. Plank count is simply the number of plank pairs in the chain — there
is no separate mode token and no attention marker in the URL at all.

Cross-workspace references are generalized as **workspace rebasing**, not as
compound ids. `w` is a reserved key; a mid-chain `/w/<workspaceId>` pair switches the
base that subsequent ids resolve against, so every id in the path stays a plain
entity id — no plugin ever has to encode a space id inside an object id. The deck's
active workspace is defined as whatever workspace the leading `w` pair names.

Attention is never serialized — it is ephemeral, like a text cursor. On load,
attention defaults to the last plank in the chain.

Reserved namespace, so registrations can't collide with grammar or app-level
routing:

- the `w` key itself (no plugin may claim it)
- `reset`, `redirect` (`/redirect/*` passthrough), `not-found`
- any segment shaped like a SpaceId or EntityId, reserved as a prefix
- query params `spaceInvitationCode`, `deviceInvitationCode`, `token`, `type` —
  these stay owned by the `NavigationHandler` capability (plugin-space,
  plugin-client) and are untouched by this design
- the `plank` query param is deleted outright
- Tauri `composer://a/b/c` deep links are unchanged

Examples:

| URL                                             | Meaning                                 |
| ----------------------------------------------- | --------------------------------------- |
| `/w/B2AK…/doc/01JGDOC…`                         | one plank                               |
| `/w/B2AK…/doc/A…/sheet/B…`                      | two planks                              |
| `/w/B2AK…/doc/A…/comments`                      | plank + comments companion              |
| `/w/B2AK…/doc/A…/w/C7QP…/task/B…`               | second plank sourced from another space |
| `/w/!dxos:settings/plugin/org.dxos.plugin.deck` | pinned workspace                        |

A generic `obj` key (owned by plugin-space) guarantees that every ECHO object has a
URL even if no more specific key applies.

A workspace-only URL (`/w/<workspaceId>`) switches the active workspace and restores
that workspace's persisted deck — it never clobbers deck state.

## Prefix keys on graph-builder extensions

The per-extension interface is a single declaration — there is no per-extension
resolve function or path function to implement. The whole URL mapping is static,
computed entirely from information the graph builder already has.

- **Declaration.** An optional `urlKey` field on `CreateExtensionOptions`
  (`packages/sdk/app-graph/src/graph-builder.ts`), e.g. `urlKey: 'collection'`. That
  is the entire per-extension surface. `urlKey` defaults to the plugin id (the
  module id the extension is registered under) when omitted, so every extension is
  URL-addressable out of the box; the primary node types users actually navigate to
  (`doc`, `mail`, `collection`, …) explicitly set short, convenient keys. Companion
  connectors declare a key the same way — their pairs consume no id segment and
  attach to the preceding plank node's `~variant`-linked segment.
- **Static mapping, both directions.** Forward, a URL segment is produced by
  concatenating the key with the node id. Reverse, resolution is the builder's job,
  derived from what the extension already declares — its `match`/relation chain and
  the static shape of the paths its connector produces. For example, TypeSection's
  `root/<space>/<group>/<typename>/<id>` shape is fully determined by the extension
  instance, with no runtime lookup required. Forward resolution walks that
  statically-known chain from the current workspace base and materializes the node
  through the existing connector-expansion machinery (`NotFound.expandPath`) —
  connectors remain the single source of truth for node construction; nothing new is
  invented to build nodes. Reverse resolution works because the builder knows which
  key-declaring extension produced a given node, so it can serialize that node back
  to `(key, node id)`. Exactly how the builder extracts a static path shape from
  existing extension metadata is the main open design task for phase A1 — the
  constraint driving that design is fixed: no per-extension resolution code.
- **Unmapped nodes.** A plank whose node has no key-declaring producer is skipped
  during serialization, with a `log.warn` as a dev-time signal. The generic `obj`
  key on plugin-space makes this rare in practice for ECHO objects.
- **Multiple keys per plugin.** This is fine — plugin-space declares both
  `collection` and `database`, either of which can address the same object; dedup by
  EID already exists in the open flow.
- **Uniqueness.** Keys are global. On collision, the first registration wins (by
  Position, then module order — matching existing connector-ordering semantics);
  later registrations of the same key are dropped with
  `log.warn('duplicate URL prefix key', …)`. Registration rejects the reserved `w`
  key, other reserved words, and SpaceId/EntityId-shaped keys. Registered keys are
  exposed to devtools as `composer.urlPrefixes`.
- **Sugar for TypeSection.** `createTypeSectionExtension` fills in `urlKey`
  automatically, sourced from a new `AppAnnotation.UrlPrefixAnnotation` on the
  schema, falling back to the lowercased last segment of the typename when the
  annotation is absent. `createTypeSectionPathResolver` is deleted — the annotation
  plus the automatic reverse mapping replace it entirely.
- **Dormant machinery deleted.** `ResolverExtension`, `_resolvers`,
  `_onInitialize`, `Graph.initialize`/`onInitialize`, the commented-out resolvers in
  plugin-space, and their call sites (`NotFound.expandPath`'s initialize fallback,
  `spaces-ready.ts:135`, and the resolver test suites) are removed rather than left
  dormant.

## Resolution architecture

**Forward (URL → deck).** A new module,
`packages/sdk/app-graph/src/path-resolution.ts`, exports `resolveUrl(builder,
parsed)`. It walks the parsed pairs left to right, tracking the current workspace
base (updated whenever a `w` pair is encountered): for each node pair it looks up
the key (an unknown key resolves to not-found), statically derives the verbose
graph path for that key/id, and materializes the node through the existing
`NotFound.expandPath` ancestor-expansion machinery. Companion pairs resolve after
their owning plank's node already exists, since they attach to it.

**Validation and dedup.** `NotFound.validateNavigationTarget`
(`packages/sdk/app-toolkit/src/app/NotFound.ts`) drops its `pathResolvers`
parameter entirely. The EID is now formed either from the current workspace base
plus the pair's entity id during URL resolution, or — for in-app navigation — via a
new plain helper, `Paths.tryGetEid(graph, qualifiedId)`. That helper is the logic of
plugin-space's old generic resolver, moved into app-toolkit where it has no plugin
dependency. The same helper replaces the resolver fan-out currently used for DXN
dedup in `plugin-deck/src/operations/open.ts`. Local/remote existence checks are
unchanged.

**Reverse (state → pushState).** `deck.active` is serialized in plank order via the
automatic reverse mapping described above, emitting a `w` pair whenever the next
plank's workspace differs from the current base. The attended plank's companion
pair, if one is open, is appended after it.

**Capability fates:**

| Capability                                                                                                                      | Fate                                                                                                                                                                                                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NavigationPathResolver` (capability, `AppPlugin.addNavigationResolverModule`, and the 7 plugin `navigation-resolver.ts` files) | Deleted. The two `NavigationTargetResolver` contributions currently embedded inside plugin-space's and plugin-inbox's resolver files are extracted first, into standalone `navigation-target-resolver.ts` files, before the surrounding resolver machinery is removed. |
| `NavigationTargetResolver`                                                                                                      | Kept — used by assistant to turn a query into target paths; unrelated to URL resolution.                                                                                                                                                                               |
| `NavigationHandler`                                                                                                             | Kept — owns invitation/OAuth query-param side effects, which stay out of scope for this design.                                                                                                                                                                        |

No compatibility shims are introduced anywhere; every call site is updated in the
same change, per the repo's no-shim rule.

**Dependency note.** EID handling inside app-graph needs `EID`/`Key` from
`@dxos/keys` (a leaf dependency, acceptable to add). The alternative — keeping id
parsing in app-toolkit and passing app-graph an opaque string — avoids even that
leaf dependency and should be confirmed as the preferred shape at implementation
time.

## Single-mode deck

Collapse the three-way `LayoutMode = 'multi' | 'solo' | 'solo--fullscreen'` into a single mode. There is no mode to select — presentation is derived from plank count, and fullscreen is a transient overlay rather than a state.

### State model

`packages/plugins/plugin-deck/src/types/schema.ts` keeps only what a deck actually needs:

- `active: string[]` — ordered, and the sole URL-serializable boundary.
- `inactive` — closed-plank history.
- Local view-state (`plankSizing`, `companionOpen`, `companionFrameSizing`) — per-device, never URL-encoded.

Deleted:

- `solo` — a solo deck is simply a singleton `active`.
- `initialized`.
- `fullscreen` — moves to `EphemeralDeckState.fullscreen?: string` (a plank id), transient, cleared on workspace switch, never persisted, never in the URL.
- `StoredDeckState.previousMode`.
- `companionOrientation` and the vertical-splitter path (vertical companions are dropped — see Deferred).
- `LayoutMode`, `isLayoutMode`, `getMode`.

```ts
interface DeckState {
  active: string[];
  inactive: string[];
  plankSizing: Record<string, number>;
  companionOpen: boolean;
  companionFrameSizing: Record<string, number>;
}

interface EphemeralDeckState {
  fullscreen?: string; // Plank id; transient, never persisted, never in the URL.
}
```

Presentation is derived, not stored: `'fullbleed' | 'sliding'`. One plank renders fullbleed (today's solo look); two or more render as today's sliding deck (resizable horizontal `Mosaic.Stack`). No tiling for now. Below the `md` breakpoint, sliding with full-width scroll-snap replaces the state-mutating mobile effect at `packages/plugins/plugin-deck/src/containers/Deck/DeckContent.tsx:51-62` — the mobile "solo-ify" side effect goes away because there is no mode to force.

Fullscreen remains a transient overlay: it renders only the given plank headless, driven by `EphemeralDeckState.fullscreen`, independent of `active`. The presenter flow and Escape-to-exit both key off this ephemeral field rather than a mode.

### Settings

`packages/plugins/plugin-deck/src/types/Settings.ts`:

- `navigationDefault: 'replace' | 'new-plank'`, default `'replace'` — a per-user preference, not a mode flip. No migration machinery is needed beyond the standard settings default.
- `overflow` is not introduced (tiling is deferred, so there's nothing for it to configure).
- `enableDeck` is deleted. Its purpose — keep one panel open at a time — is now just the `'replace'` default; there is no separate toggle to fork behavior.

### Navigation disposition

`LayoutOperation.Open` (`packages/sdk/app-toolkit/src/operations/LayoutOperation.ts`) gains:

```ts
disposition?: 'default' | 'inverse' | 'replace' | 'new-plank';
```

Click handlers pass `'inverse'` when `event.shiftKey`. The deck's open handler resolves the effective disposition via a pure function:

```ts
resolveDisposition(setting: 'replace' | 'new-plank', disposition?: Disposition): 'replace' | 'new-plank';
```

`'default'`/`undefined` defers to the setting; `'inverse'` flips it. Because inversion is symmetric, a user who flips `navigationDefault` gets the mirrored shift-click behavior for free — no separate "inverse" table to maintain. Programmatic callers that must force a specific outcome pass an explicit value (e.g. `useShowItem`'s pivot-open path passes `'new-plank'`).

Behavior mapping in `packages/plugins/plugin-deck/src/layout.ts`:

- `new-plank` → today's multi-stack push, `openSubjectsOnActiveDeck`.
- `replace` → splice at the pivot/attended-plank index via a new `replaceSubjectsOnActiveDeck`, reproducing today's solo-replace behavior but generalized to one plank among N (swaps only the navigated-from plank).

Call-site changes:

- `react-ui-list`'s `TreeItemHeading` `onSelect` gains `{ option, shift }` modifiers.
- `plugin-navtree`'s `NavTreeContainer.handleSelect` drops the `mode === 'multi' ? Set : Open` branch entirely — always dispatches `Open` with a disposition.
- `plugin-markdown` link/preview handlers thread `shiftKey` through to the disposition.
- The remaining ~60 `Open` call sites need no change; omitting `disposition` means `'default'`.

### Operations & Layout capability

- `LayoutOperation.SetLayoutMode` and its four handlers (deck, simple-layout, testing, spotlight) are deleted outright. `plugin-support`'s on-create-space flow switches to `LayoutOperation.Set`. The deck url-handler's forced-solo block is deleted; as an interim measure (until the URL cutover in Workstream A replaces this file wholesale), the handler branches on `active.length === 1` vs `> 1` to keep today's URL shapes intact.
- `DeckOperation.Adjust`'s `PartAdjustment` union collapses `'solo' | 'solo--fullscreen'` into `'fullscreen'`, which toggles the ephemeral field rather than mutating deck state. `'companion-vertical'` is deleted. "Solo this plank" is already covered by the existing `close-others` graph action, so no replacement is needed. Presenter (`plugin-presenter/src/operations/toggle-presentation.ts`, `DocumentArticle.tsx`) is rewired to drive ephemeral fullscreen instead of a mode.
- `AppCapabilities.Layout.mode: string` is renamed to `variant: string` (`'deck' | 'simple'`), with a new `fullscreen: boolean` field alongside it. The rename is deliberate: every stale consumer becomes a compile error, which is how the repo's no-shims rule is enforced here. Consumers requiring updates: deck `capabilities/state.ts`, simple-layout `state.tsx`, `NavTreeContainer`, plugin-space `CreateObjectDialog`, app-toolkit `useShowItem`, plugin-magazine `SubscriptionsArticle`, plugin-presenter `DocumentArticle`, and deck internals (`DeckLayout`, `Sidebar`, `ComplementarySidebar`, `DeckViewport`, stories).

### Rendering

`DeckSoloMode` and `DeckMultiMode` merge into a single `Deck.Planks` component on the existing `Mosaic.Container > ScrollArea > Mosaic.Stack` pipeline. When `active.length === 1` it applies fullbleed styling (no resize handle, no scroll); otherwise it's today's resizable sliding stack. Planks stay mounted across 1↔2 transitions — no remount when a second plank opens or the last one closes.

`Part`/`ResolvedPart` collapse `'solo' | 'multi'` into `'main'`, which completes the Phase-3 "reduce ResolvedPart" item tracked in `packages/plugins/plugin-deck/src/components/Matrix/SPEC.md`.

`PlankControls` drops the solo/unsolo and vertical-companion buttons, keeping fullscreen, increment, close, and companion controls.

### Persisted-state migration

Effect Schema decode silently strips fields that no longer exist in the schema. Without an explicit migration, an old persisted blob would decode "successfully" while quietly dropping `solo` — a user who left the app in solo mode would reopen it having lost their open plank, with no error to signal why.

A new `packages/plugins/plugin-deck/src/util/migrate-persisted-state.ts` runs before the KVS atom (localStorage key `org.dxos.plugin.deck.state`) is first read:

- Old-shaped JSON, per deck: `active = solo ? [solo, ...active.filter((id) => id !== solo)] : active`.
- Drop `solo`, `fullscreen`, `initialized`, `companionOrientation`, `previousMode`.
- Parse failure → delete the key, matching the existing corrupt-data fallback.

This replaces `sanitize-persisted-state.ts`, which (along with its test) is deleted.

## Deferred

- **Tiling presentation** (side-by-side equal tiles when planks fit) — stick with the existing solo/deck presentations for now; revisit once the single-mode model has settled.
- **Vertical companions** — dropped in this pass; how they return (if at all) is an open question for later.
- **Companion-orientation encoding in the URL** — moot while vertical companions are dropped; nothing to encode.
- **`@dxos/keys` dependency placement** for EID handling in app-graph, vs. an opaque string parsed in app-toolkit — decide at implementation time, not in the spec.
- **`NavigationTargetResolver` emitting pair chains** instead of graph paths — a follow-up once the URL grammar has landed.

## Execution policy

This is of paramount importance and applies to spec upkeep as well as every implementation phase: the bulk of execution work MUST be delegated to cheaper models. Subagents running Sonnet perform the file-by-file writing — mechanical call-site sweeps, per-plugin `urlKey` declarations, test authoring, consumer updates for the `Layout.mode` rename, and similar mechanical labor. The premier model is reserved for driving and validation only: decomposing phases into well-scoped subagent tasks, writing their prompts, reviewing and validating output (builds, tests, spot-reads), and integrating results. Follow-up sessions inherit this policy through this spec and the project `TASKS.md` — do not revert to doing the mechanical work directly.

## Phased implementation plan

Two workstreams. Workstream A (URL mapping & resolution) and Workstream B (single-mode deck) are independent except where noted.

**Workstream A — URL mapping & resolution**

- **A1. Grammar + builder core** (lands independently):
  - `app-toolkit/src/app/UrlPath.ts` — pure parse/format, including mid-chain `w` workspace rebasing and reserved words.
  - `graph-builder.ts` — `urlKey` declaration; delete dormant resolver machinery.
  - New `app-graph/src/path-resolution.ts` — key table, static path derivation from extension metadata (the main design task here; constraint: no per-extension resolution code), `resolveUrl`, automatic reverse mapping.
  - `plugin-graph/src/graph.ts` — pass declarations through (keys are global, not module-scoped).
- **A2. Declarations across plugins** (independent; old URLs still work):
  - TypeSection auto `urlKey` + `UrlPrefixAnnotation`.
  - plugin-space keys (`collection`, `database`, `home`, generic `obj`).
  - settings/registry `plugin` key.
  - companion keys on existing companion connectors.
  - type-section plugins: markdown `doc`, inbox `mail`/`calendar`, thread `channel`, assistant `chat`, brain `topic`, routine, magazine.
- **A3. Cutover** (single change, no shims):
  - Rewrite deck and simple-layout url-handlers.
  - Delete `plank-url-params.ts`.
  - Update `open.ts`/`NotFound.ts` — drop `pathResolvers`, add `Paths.tryGetEid`.
  - Delete the `NavigationPathResolver` capability and its 7 plugin `navigation-resolver.ts` files, after first extracting the 2 genuine `NavigationTargetResolver` contributions.
  - Update `Paths.ts` (delete `toUrlPath`/`fromUrlPath`), plugin-markdown links (`useExtensions.tsx`), the collections shareable-link action, `spaces-ready.ts`.

**Workstream B — single-mode deck** (independent of A; only B2's interim url-handler edits touch URL logic, and they preserve current URL shapes so A3 can replace that file wholesale):

- **B1. Settings + disposition plumbing** (user-visible: shift-click opens side-by-side): `navigationDefault` setting; `disposition` on `Open`; `resolveDisposition` + `replaceSubjectsOnActiveDeck`; tree modifier param; navtree + markdown click sites.
- **B2. State-model collapse + operations surface** (atomic): new `DeckState`, ephemeral fullscreen, migration util, rewrite `set-active.ts`, simplify open/close/set/adjust/switch-workspace, delete `SetLayoutMode` everywhere, `Layout.mode` → `variant` + `fullscreen` with all consumers, presenter rewiring, drop vertical companions.
- **B3. Presentation merge**: merged `Deck.Planks` (fullbleed vs. sliding), mobile snap, `PlankControls` cleanup, `Part` collapse, delete `enableDeck`.
- **B4. Cleanup**: translations; `plugin-deck/DESIGN.md`/`PLAN.md`/`components/Matrix/SPEC.md` updates; stories; grep sweeps for `solo`, `LayoutMode`, `SetLayoutMode`, `previousMode`, `enableDeck`, `companion-vertical`.

**Sequencing**: B1 → A1/A2 (parallel with B2/B3) → A3 → B4 + final e2e pass. A3 lands cleanest after B2, since the url-handler rewrite then writes the pair chain straight from `active` with no solo/multi branch to reconcile.

## Verification

**Tests to update**: `Paths.test.ts` (drop `toUrlPath`/`fromUrlPath` suites); delete `plank-url-params.test.ts`; rework resolver/initialize suites in `graph-builder.test.ts`/`graph.test.ts`; `layout.test.ts` + `set-active.test.ts` for the flat `active` model; `sanitize-persisted-state.test.ts` → `migrate-persisted-state.test.ts`.

**New tests**:

- `UrlPath.test.ts` — tokenization (pairs, companion keys, mid-chain `w` rebasing, pinned workspaces, reserved words, malformed input → not-found); format/parse round-trip property test.
- `path-resolution.test.ts` — chain resolution, companion attach, cross-workspace rebase, duplicate-key drop + warn, reverse-mapping round-trips including `~` companion nodes and `w`-pair emission on workspace change.
- `resolveDisposition` matrix, including inversion symmetry.
- Tree modifier propagation in `react-ui-list`.
- Deck open-handler integration tests: replace/inverse/setting-flip sequences.
- url-handler serialization unit test.

**End-to-end** (running Composer, `moon run composer-app:serve`):

| Scenario                                   | Expected                                                                                |
| ------------------------------------------ | --------------------------------------------------------------------------------------- |
| Open a doc                                 | Renders fullbleed                                                                       |
| Shift-click a second item                  | Opens sliding deck                                                                      |
| Plain click                                | Replaces the attended plank                                                             |
| Flip `navigationDefault`                   | Shift-click inversion is symmetric                                                      |
| Fullscreen + Escape + reload               | Ephemeral — does not survive reload                                                     |
| Solo-user migration                        | Preserves the previously open plank                                                     |
| Reload multi-plank URL                     | Restores planks + companion; attention is NOT restored from URL, defaults to last plank |
| Cross-workspace deep link                  | Round-trips its mid-chain `w` pair                                                      |
| Not-yet-replicated object                  | Hits the remote existence check                                                         |
| `/reset`, invitation params, `composer://` | Unaffected                                                                              |
| Mobile (simple-layout)                     | Unaffected                                                                              |
| Presenter flow                             | Intact                                                                                  |

---

## Addendum (2026-07-22): nested `url` binding + workspace anchor

The per-extension URL contract was refactored from four flat fields
(`urlKey`/`urlKeyHasId`/`urlPath`/`resolve`) into a single nested binding on
`BuilderExtension` — the binding is optional (not every extension is
addressable), but when present all fields are required:

```ts
url?:
  | { key: string; kind: 'anchor' | 'item' | 'singleton'; path: string[] | PathResolver }
  | { key: string; kind: 'linked' };
```

`kind` is the **resolution tier** — what a pair with this key resolves against;
`hasId` is derived (`hasId = kind !== 'singleton'`), so invalid combos are
unrepresentable:

- `anchor` — resolves at the root and _establishes the base_ others resolve
  against; consumed as a workspace rebase (`w`).
- `item` — resolves against the current anchor base, addressed by a variable id
  (may have children — not a graph leaf).
- `singleton` — resolves against the anchor base, one fixed node per anchor, no
  id (`home`, `settings`).
- `linked` — resolves against the _immediately preceding item_, addressed by a
  variant id; a sub-view attached to a plank (a companion). Has no `path`
  (resolution is structural: the preceding item's `~<variant>` child).

`path` (non-`linked` kinds) merges the former `path`/`resolve` into one required
field, discriminated at runtime by `Array.isArray`: `string[]` = static ancestor
segments (the common case); `PathResolver` = a dynamic resolver (nested
collections, native fs). A key therefore always declares exactly one resolution
mechanism.

Both `anchor` and `linked` are declared once via declaration-only extensions
(`createWorkspaceAnchorExtension` / `createCompanionExtension`) contributed by the
layout plugin — so `w` and `companion` are ordinary declared keys, not reserved
tokens. Only `reset`/`redirect`/`not-found` remain reserved.

The workspace tier (`/w/<workspace>`) is no longer a hard-coded token. It is a
declared `kind: 'anchor'` binding contributed by
`createWorkspaceAnchorExtension()` (in `@dxos/app-toolkit`), registered by the
active layout plugin (deck / simple-layout) so it is workspace-generic (spaces
and pinned workspaces alike), not tied to `plugin-space`. An anchor pair rebases
the workspace base for following pairs and is consumed rather than opened as a
plank — so the resolver is unchanged; only the parser/serializer key off
`anchor` (from the key table) instead of the literal `w`. `companion` remains
the one well-known key (matched by the `~<variant>` convention). `w` is no
longer a reserved word; `reset`/`redirect`/`not-found`/`companion` still are.

New helper `PathResolution.getAnchorKey(builder)` returns the declared anchor
key; `UrlPath.ParsedUrl`/`format` carry `workspaceKey` so `parse ∘ format`
round-trips. URL output is byte-identical (`getAnchorKey → 'w'`), so there is no
migration.

### Addendum (2026-07-22): `urlSegment` on nodes

Graph-builder nodes now carry their computed URL pair as `properties.urlSegment`
(`/<key>[/<id>]`, no workspace prefix), readable via the `GraphBuilder.BuilderNode`
wrapper type (an open properties record with an explicit `urlSegment?: string`,
mirroring react-ui-menu's node wrappers). Core `Node` stays URL-agnostic.

- The builder stamps binding-backed nodes (and their inline children) during the
  connector-materialization pass via `nodeUrlSegment(nodeId, url)` — the same
  `urlRepresentation` derivation `representNode` uses, so there is one source.
  Container nodes sitting at the binding's `path` (empty id) get no segment.
- Linked (companion) nodes — those whose id ends in a `~<variant>` segment — are
  stamped by the builder too, as `/<linkedKey>/<variant>` (the declared `linked`
  tier key; see `getLinkedKey`). So `AppNode.makeCompanion` no longer stamps a
  segment — the builder owns the whole mapping. (Superseded the interim
  makeCompanion-stamps-it approach.)
- `Paths.getShareableLinkPath` composes the full link as `/w/<workspace>` +
  `node.urlSegment`.
