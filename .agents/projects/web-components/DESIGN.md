# Web-Component Surfaces — Design

Migrate Composer's rendering from a single React tree to web-component
boundaries: `<dx-surface>` custom elements each hosting their own React root,
with the Surface dispatch layer becoming framework-neutral. React-native
surfaces remain fully supported throughout — the migration is incremental,
per-role and per-definition, and reversible at every step.

## Scope

- **In scope**: the Surface dispatch/boundary architecture, the root/provider
  factory, de-React-ing the coordination systems (DnD, form, attention
  bindings), dual-mode (React + web-component) surface support, and the plugin
  author contract for framework-neutral surfaces.
- **Out of scope: Patchwork.** Integration with Ink & Switch's Patchwork system
  is a potential future direction _enabled_ by this project (the boundary
  contract `(element, data) => cleanup` is isomorphic to a Patchwork
  tool/component), but no Patchwork-facing work is part of this project.
  Background comparison lives on the `claude/design-notes-valioa` branch
  (`docs/design/patchwork-comparison/`).
- **Deferred**: Shadow DOM (see Risks — light DOM is required for now),
  replacing Radix dialog/popover primitives, migrating the deck shell itself.

## Vision / end state

Today React hosts everything; `WebComponentWrapper` is the escape hatch for
foreign renderers. The end state inverts that:

- `<dx-surface>` is the **framework-neutral dispatcher**. It resolves
  candidates from the `SurfaceManager` (plain JS) and mounts each by `kind`:
  - `kind: 'web-component'` → `document.createElement(tagName)` + property
    assignment. No React involved.
  - `kind: 'react'` → delegated to a lazy-loaded **react-bridge** module that
    creates a root wrapped in the provider factory.
- React becomes a dependency of the react-bridge, loaded only while at least
  one react-kind definition is registered. Plugins convert definition-by-
  definition (`Surface.create` → `Surface.createWeb`); nothing forces
  conversion, and unconverted surfaces keep working unmodified.
- Nothing in the current architecture is treated as permanent: per-item roles
  that must stay in-tree today (form fields, tree rows) migrate later, when
  their coordination systems move off React context (see backlog below).

The **surface author contract** (any kind): everything a surface needs arrives
via `data` plus framework-neutral services (atom registry, ECHO, capability
singletons). Ambient React context is a convenience of the react-bridge, not
part of the contract. `plugin-map-solid`'s `dx-map-surface` is the reference
implementation (light DOM via `noShadowDOM()`, data-only, `@dxos/echo-solid`
bindings).

## Current state (inventory summary)

Full inventories were gathered 2026-07-24 (session appendices; key figures):

- **334 `Surface.create` definitions fan into ~64 production consumer sites
  across 30 roles** — dispatch flips centrally; contributors are untouched.
- **Only 4 roles fan out per-item**: `CardContent` (list/board items),
  `Article` (per plank), `NavtreeItemEnd` (per tree row — already flagged for
  removal, `NavTreeContainer.tsx:26`), `FormInput` (per form field). All other
  roles are singletons or per-plank — cheap to give their own root.
- **~20 provider layers** sit above every Article surface
  (`useApp.tsx:322-337` kernel providers + `App.tsx:104-116` composed
  `Capabilities.ReactContext` contributions + deck/DnD/popover/pane layers).
- Context classification:
  - **App-global, re-providable from singletons**: PluginManager,
    `RegistryContext` (effect-atom), SurfaceManager, Theme (+ Density/
    Elevation/Translations), Tooltip/Toast, Client/HALO, Attention/ViewState.
  - **Tree-positional (blockers)**: `FormContext` (hard-throw, mounted per
    `Form.Root` by a different plugin than the field surface), Radix
    `Dialog.Root`/`Popover` composite contexts, `Dnd.Root`'s container
    registry (`Mosaic.Container` hard-crashes without it).
- **Hazard: `RegistryContext` fails silently.** It has a module-level default
  (a fresh disconnected registry), so a root missing the provider doesn't
  crash — capability/ECHO/atom state silently goes stale. The factory must
  hard-wire `manager.registry` and dev-assert identity.
- **The web-component path already ships**: `Surface.createWeb` +
  `WebComponentWrapper` (`SurfaceComponent.tsx:50-101`, property-assignment
  protocol — live ECHO proxies cross by reference) with one production user
  (`dx-map-surface`, Solid). `SurfaceDebug`'s overlay is an in-repo precedent
  for a separate React root fed by a plain singleton + `useSyncExternalStore`.
- **Attention is DOM-native** (`data-attendable-id` + `closest()` + one
  root-level focus-capture listener) — works across roots in light DOM;
  breaks app-wide under Shadow DOM (focus retargeting + `closest()` can't
  cross shadow boundaries).
- **DnD** is `@atlaskit/pragmatic-drag-and-drop` (DOM-scoped, portable) under
  a React-context registry (`Dnd.Root`, mounted once in `DeckLayout.tsx:38`) —
  the registry is the only cross-root blocker.
- **Popover/Dialog** already use root-tolerant indirection (serializable
  descriptors, string `popoverAnchorId`, DOM-ref virtual anchoring, singleton
  hosts in `DeckLayout`); the remaining coupling is Radix's internal contexts.

## Architecture

### `<dx-surface>` element

Registered at boot via `registerSurfaceElement({ manager })`. Receives `role`
as an attribute and `data`/`limit` as element **properties** (live objects,
same-realm — reuse the `WebComponentWrapper` diff protocol). On connect:
resolve candidates, mount per `kind`; on disconnect: teardown. Emits
`dx-surface:mounted` / `dx-surface:unmounted` events so hosts drive
placeholders without shared Suspense.

- **Light DOM only** (attention, CSS cascade, Tailwind, focus).
- **Node-keyed identity**: hosts must preserve `key={node.id}` semantics —
  Article subtrees are expensive to remount (`DeckPlank.tsx:130-136` keeps
  `Splitter.Root` invariant for exactly this reason). The element must not be
  recreated when only `data` changes.
- Same-realm live-object properties mean this is **not** an isolation
  boundary; isolation (and any serialization contract) is a separate future
  concern.

### `SurfaceRootProviders` (root factory)

Extracted from `App.tsx`'s `composeContexts`: kernel trio baked in
non-optionally (`PluginManagerProvider`, `RegistryContext.Provider
value={manager.registry}` + dev invariant, `SurfaceManagerProvider`), then the
topologically-sorted `Capabilities.ReactContext` contributions. `App.tsx`
becomes the factory's first consumer. Contract tightening: `ReactContext`
contributions must be **stateless carriers of shared singletons** (no
app-state `useState` in providers).

Because each root re-provides `SurfaceManagerProvider`, nested `<Surface>`
usage inside a migrated root keeps dispatching in-tree — the two-tier
structure needs no special casing.

### Dispatch switch

`Surface.Surface` keeps its React API. Internally, a **feature-flagged
per-role allowlist** decides in-tree dispatch (today's path) vs rendering a
`<dx-surface>` boundary. Consumer JSX and all 334 contributor definitions are
untouched. The allowlist must support the `deckCompanion.<variant>` dynamic
token family via prefix matching.

### Context migration backlog (React context → neutral store + thin binding)

| System         | State today                                                        | Move                                                                                                                                                                                                       |
| -------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Attention      | `AttentionManager` plain class via capability; DOM-attr write path | Done in substance; add non-React binding                                                                                                                                                                   |
| Theme          | `tx()` plain fn, dark-mode class, density partly CSS               | Thin binding already; document fallback path                                                                                                                                                               |
| DnD            | `Dnd.Root` React-context registry over DOM-scoped pragmatic-dnd    | Phase 0: registry → capability-provided singleton; `Dnd.Root` becomes stateless carrier                                                                                                                    |
| Form           | Hard-throw `FormContext` per `Form.Root`                           | Form store in effect-atom; store handle travels via `data` (extend `FormInput` data with `form`); context kept as compat binding; later: form-associated custom elements (`ElementInternals`) where useful |
| Dialog/Popover | Radix internal contexts; hosts already descriptor/DOM-ref based    | Last; blocked on replacing Radix primitives (native `<dialog>`/popover API) — a react-ui workstream, not surface dispatch                                                                                  |

Non-React capability/atom bindings (lit or vanilla over `@effect-atom/atom`
core + the manager) must exist before the first plugin converts, or authors
will reinvent them (`@dxos/echo-solid` proves the per-framework-binding
pattern).

## Phases

- **Phase 0 — prerequisites** (each independently valuable): root factory;
  `ReactContext` contract + audit; DnD registry de-contextualization;
  data-churn fixes (unmemoized `data` literals, e.g. `KanbanCard.tsx:82` —
  matters more once identity churn costs a teardown across the boundary).
- **Phase 1 — prove the boundary**: `<dx-surface>` + allowlist behind a flag;
  migrate `StatusIndicator` or one `deckCompanion` variant. Validate atom/ECHO
  reactivity, attention styling, tooltips/portals, HMR, Storybook.
- **Phase 2 — Article + plank chrome** (NavbarEnd, MenuFooter, Navigation).
  Deck then composes DOM elements. Dialog/Popover stay centralized in-tree.
- **Phase 3 — the inversion**: `<dx-surface>` mounts web-component candidates
  directly; react-kind goes through a lazy react-bridge; non-React bindings
  ship; Form migrates off context per the backlog.

## Risks

- `RegistryContext` silent staleness (mitigated: factory hard-wiring + dev
  invariant + a test asserting root registry === manager registry).
- Cross-root updates aren't batched (fine at ≤ ~20 roots — planks + always-
  mounted companion panels; do not root per-item roles until their
  coordination systems migrate).
- Shadow DOM anywhere under a plank breaks attention app-wide — enforce light
  DOM until `getAttendables` is rewritten around `composedPath()`.
- Popover anchor measurement race (`DeckLayout` `Popover.tsx:26-56`, 40ms
  debounce) is pre-existing; watch it across boundaries.
- StrictMode/HMR/test harnesses need updating to the factory.

## References

- Inventory reports (Surface consumers/cardinality, context dependencies,
  DnD/portals/attention, existing web-component path): session research,
  2026-07-24; key citations inlined above.
- Patchwork comparison (context only, out of scope):
  `docs/design/patchwork-comparison/` on branch `claude/design-notes-valioa`.
- React externalization research (import maps, vendor shims, single-React
  constraints, prior art: Grafana/Backstage/single-spa): session research,
  2026-07-24 — relevant to Phase 3 remote/plugin bundling; DXOS already ships
  the host-side mechanism (`vite-plugin/packages.ts`, `import-map/`,
  `composerPlugin` externals).
