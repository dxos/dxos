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

- [x] **Add hover trigger option (default true)** — `dx-anchor` owns hover intent (`trigger` prop, 400ms open / 300ms grace, doc-level pointerover keeps card alive over `[data-dx-popover-content]`); click pins; focus-open removed deliberately (popover returns focus on close → re-open loop; Enter/Space added instead).
- [x] **Port shadcn-style open/close animation** — `--animate-popover-in/out` tokens applied in story + deck popover.
- [x] **Story coverage** — `Preview` (hover default) + `PreviewClickTrigger`; verified 10/10 Playwright checks against worktree storybook.

## Phase 3: New tree

- [ ] **Implement the new Tree** per DESIGN.md decision.
- [ ] **Replace the navtree tree** in the composer sidebar.
- [ ] **Stories + keyboard/DnD verification.**

### References

- https://ui.shadcn.com/docs/components/hover-card
- https://ark-ui.com/docs/components/tree-view
- https://ark-ui.com/docs/components/editable
