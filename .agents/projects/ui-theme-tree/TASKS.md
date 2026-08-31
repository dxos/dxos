# ui-theme-tree — Tasks

_Resume: research agents running (theme audit, shadcn/ark docs, dx-preview map, tree audit, ark tree-view docs). Uncommitted: registry + project docs. Last: project registered._

## Phase 1: Audits

Contrast our theme and tree with shadcn/ui and Ark UI to ground the design decisions.

### Tasks

- [ ] **Audit surfaces** — `packages/ui/ui-theme/src/css/theme/surfaces.css` vs shadcn theming vars and Ark styling conventions.
  - User focus (2026-08-30): surface colors and how contrast works at the different elevations — selection, hover, borders per surface level. Compute effective values per level, both themes.
- [ ] **Audit density** — control/toolbar sizing vs shadcn/Ark size variants.
- [ ] **Audit Tree** — `react-ui-list` Tree vs `@ark-ui/react` tree-view: disclosure + animation, keyboard nav, DnD, end-of-row menus/indicators, multiple islands.
- [ ] **Decision: adopt @ark-ui/react/tree-view vs rewrite** — write up impact in DESIGN.md.
  - User direction (2026-08-30): prefer adopting Ark as an experiment — exercise ark/zag concepts against our reactivity (atom, ECHO) and verify pragmatic-dnd can layer over Ark's parts.

## Phase 2: dx-preview hover card

- [ ] **Add hover trigger option (default true)** to the editor preview popover, modeled on shadcn hover-card (openDelay/closeDelay).
- [ ] **Port shadcn-style open/close animation** (fade + zoom, data-state driven).
- [ ] **Story coverage** — hover and click variants in the widgets Preview story.

## Phase 3: New tree

- [ ] **Implement the new Tree** per DESIGN.md decision.
- [ ] **Replace the navtree tree** in the composer sidebar.
- [ ] **Stories + keyboard/DnD verification.**

### References

- https://ui.shadcn.com/docs/components/hover-card
- https://ark-ui.com/docs/components/tree-view
- https://ark-ui.com/docs/components/editable
