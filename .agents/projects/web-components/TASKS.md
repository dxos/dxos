# Web-Component Surfaces — Tasks

_Resume: Phase 0 complete and Phase 1 mechanism landed (element + allowlist + tests, no role flipped). Next: pick the first role to flip (candidates proposed to user) and wire `Surface.registerRootElement` into composer-app startup. Uncommitted: none. Last: SurfaceRootProviders factory, `<dx-surface-root>` boundary element, DndCoordinator extraction, data-memoization sweep._

## Phase 0: Prerequisites

Refactors the boundary migration depends on; each is independently valuable
and landable on its own PR. See DESIGN.md for rationale and citations.

### Tasks

- [x] **Extract the root/provider factory (`SurfaceRootProviders`)** — `Surface/SurfaceRootProviders.tsx`: shared `composeContexts` (deduped out of `App.tsx` and `testing/react.tsx`) + `SurfaceRootProviders` with the kernel trio hard-wired; dev-mode stale-registry warning added in `SurfaceComponent` (fires when the ambient registry ≠ `manager.registry`).
- [x] **Tighten the `ReactContext` capability contract** — stateless-carrier contract documented on the capability (`common/capabilities.ts`); contributors audited via the 2026-07-24 inventory (theme/client/halo/attention/devtools all derive state from capability singletons — no violations).
- [x] **De-contextualize the DnD registry** — `react-ui-dnd/src/dnd/coordinator.ts`: `DndCoordinator` plain class owns handlers + dragging state + ref-counted document monitor; `Dnd.Root` is now a stateless `useSyncExternalStore` binding over the shared default coordinator (opt-out via `coordinator` prop); consumers unchanged; unit tests added.
- [x] **Fix unmemoized Surface `data` call sites** — all 8 per-item sites memoized (kanban, board, pipeline, canvas-compute, search, thread ×2, video ×3-literals); builds green.

## Phase 1: Prove the boundary

- [x] **`<dx-surface-root>` custom element** (`dx-surface` was taken by the debug wrapper) — `Surface/SurfaceRootElement.tsx`: `registerSurfaceRootElement({ manager, surfaces })`; `data-role` attribute (avoids ARIA `role`) + `surfaceProps` property (live objects by reference); light DOM, `display: contents`; microtask-scheduled render; detach-safe teardown; `dx-surface-root:mounted`/`unmounted` events with connected-ancestor fallback dispatch.
- [x] **Per-role allowlist** — `Surface/boundary.ts`: `setSurfaceBoundaryRoles` (exact or `.*` prefix patterns, default empty = off), `BoundaryScopeContext` recursion guard, renderer injection (no module cycle); dispatch branch in `SurfaceComponent`; exported as `Surface.registerRootElement`/`setBoundaryRoles`/`isBoundaryRole`/`RootProviders` + tag/event constants; 6 boundary tests (dispatch, nested in-tree, data updates by reference, scope guard, lifecycle events, allowlist-off).
- [ ] **Migrate first role: `StatusIndicator`** — wired (registration in `useApp`, role enabled in composer `main.tsx` with localStorage escape hatch `dxos.org/surface-boundary`=off, permanent e2e spec `status-indicator.spec.ts`). Status: builds/unit green; e2e verification in flight (status-indicator spec + basic regression).

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
