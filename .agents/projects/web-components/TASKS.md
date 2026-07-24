# Web-Component Surfaces — Tasks

_Resume: Start Phase 0 — extract `composeContexts` + kernel providers from `App.tsx` into a `SurfaceRootProviders` factory in app-framework. Uncommitted: none. Last: project scaffolded (DESIGN.md written from 2026-07-24 research session)._

## Phase 0: Prerequisites

Refactors the boundary migration depends on; each is independently valuable
and landable on its own PR. See DESIGN.md for rationale and citations.

### Tasks

- [ ] **Extract the root/provider factory (`SurfaceRootProviders`)**
  - Pull `composeContexts` out of `packages/sdk/app-framework/src/ui/components/App/App.tsx:104-116` into a shared factory.
  - Bake in the kernel trio non-optionally: `PluginManagerProvider`, `RegistryContext.Provider value={manager.registry}`, `SurfaceManagerProvider` (mirror `useApp.tsx:322-337`).
  - Dev-mode invariant: root's `RegistryContext` value must be `manager.registry` (silent-staleness guard).
  - `App.tsx` becomes the factory's first consumer; add a factory unit test.
- [ ] **Tighten the `ReactContext` capability contract**
  - Document contributions as stateless carriers of shared singletons (no app-state `useState` in providers).
  - Audit the ~6 contributors (theme, client/halo, attention, devtools, transcription) for violations.
- [ ] **De-contextualize the DnD registry**
  - Move `Dnd.Root`'s container registry (`packages/ui/react-ui-dnd/src/dnd/Root.tsx`) into a capability-provided plain singleton; `Dnd.Root` becomes a stateless carrier binding.
  - `Mosaic.Container`/`useDndRootContext` consumers resolve the singleton; pragmatic-dnd monitors stay DOM-scoped (unchanged).
- [ ] **Fix unmemoized Surface `data` call sites**
  - Known: `packages/plugins/plugin-kanban/src/components/KanbanBoard/KanbanCard.tsx:82`; sweep the other per-item sites (`BoardArticle.tsx:205`, `PipelineArticle.tsx:75`, canvas-compute `Surface.tsx:52`).

## Phase 1: Prove the boundary

- [ ] **`<dx-surface>` custom element** — `registerSurfaceElement({ manager })`; `role` attribute + `data`/`limit` properties (WebComponentWrapper diff protocol); light DOM; node-keyed identity; `dx-surface:mounted`/`unmounted` events.
- [ ] **Per-role allowlist behind a feature flag** in `Surface.Surface` dispatch (prefix rule for `deckCompanion.<variant>`).
- [ ] **Migrate first role** (`StatusIndicator` or one `deckCompanion` variant) and validate: atom + ECHO reactivity, attention styling, tooltips/portals, HMR, Storybook harness.

## Phase 2: Article + plank chrome

- [ ] **Migrate `Article`** (Plank + Companion sites; preserve remount-avoidance semantics per `DeckPlank.tsx:130-136`; event-driven placeholder/fallback at the ~6 shell sites).
- [ ] **Migrate `NavbarEnd`, `MenuFooter`, `Navigation`.**
- [ ] Dialog/Popover stay centralized in-tree (no change; note in docs).

## Phase 3: Framework-neutral dispatch (the inversion)

- [ ] **`<dx-surface>` mounts `web-component`-kind candidates directly** (no React); `react`-kind via a lazy react-bridge module.
- [ ] **Non-React bindings** for capabilities/atoms (lit or vanilla over `@effect-atom/atom` core), so web-component authors don't reinvent `useCapability`.
- [ ] **Form off React context** — form store in effect-atom, store handle via `FormInput` `data`; `FormContext` kept as compat binding.
- [ ] **Author contract docs** — data-only + neutral services; `dx-map-surface` as reference.

### References

- `.agents/projects/web-components/DESIGN.md`
- `packages/sdk/app-framework/src/ui/components/Surface/DESIGN.md` (dispatch internals)
- Out of scope: Patchwork integration (future enabler; see DESIGN.md Scope).
