# ui-theme-tree — Tasks

_Resume: all three phases done and verified; next is PR prep (before/after screenshots in the description, then `submit-pr`). Uncommitted: none (ledger/design updates in the final commit). Last: full-repo build green, navtree play tests 7/7, changeset added._

## Phase 1: Audits

Contrast our theme and tree with shadcn/ui and Ark UI to ground the design decisions.

### Tasks

- [x] **Audit surfaces** — DESIGN.md §1: three-model comparison plus the empirical per-elevation
      contrast tables (probe: `temp/contrast-probe.mjs`) answering the user's focus — hover/selection/
      separator ΔL is constant across all six levels in both themes; shadcn's fixed tokens cannot
      express that invariant.
- [x] **Audit density** — DESIGN.md §1.4: our 3-variable CSS model is strictly more capable than
      shadcn's per-component cva sizes; Ark ships nothing. Nothing to adopt.
- [x] **Audit Tree** — DESIGN.md §3.1: bespoke keymap (non-APG), `aria-level=0` defect, no
      disclosure animation, group special-casing, story scaffolding cost.
- [x] **Decision: adopt @ark-ui/react/tree-view** — DESIGN.md §3.2; user direction to run it as a
      zag-vs-our-reactivity experiment.

## Phase 2: dx-preview hover card

- [x] **Add hover trigger option (default true)** — `dx-anchor` owns hover intent (`trigger` prop, 400ms open / 300ms grace, doc-level pointerover keeps card alive over `[data-dx-popover-content]`); click pins; focus-open removed deliberately (popover returns focus on close → re-open loop; Enter/Space added instead).
- [x] **Port shadcn-style open/close animation** — `--animate-popover-in/out` tokens applied in story + deck popover.
- [x] **Story coverage** — `Preview` (hover default) + `PreviewClickTrigger`; verified 10/10 Playwright checks against worktree storybook.

## Phase 3: New tree

- [x] **Implement the new Tree** — rebuilt on Ark TreeView (machine keyboard/focus/ARIA), atom-walk
      → controlled TreeCollection, groups spliced from topology, pragmatic-dnd on rows,
      enter-disclosure animation. Public `Tree` prop surface preserved. DESIGN.md §3.3–3.4.
- [x] **Replace the navtree tree** — plugin-navtree consumes the new Tree with zero code changes
      (story role updated treegrid→tree); story parity vs main verified (DOM facts + screenshots).
- [x] **Stories + keyboard/DnD verification** — 17/17 generic checks (`temp/tree-verify.mjs`),
      navtree checks (`temp/navtree-verify.mjs`), play tests 7/7, `react-ui-list` unit tests 32/32,
      full-repo build green.

## Phase 4: Wrap-up

- [ ] **PR** — before/after screenshots in description (tree story + navtree pair captured in
      `temp/`), then `submit-pr`. Confirm with user whether hover-default ships app-wide at once.
- [ ] **Human drag check** — real DnD drop in the sidebar (native drag not automatable).
- [ ] Follow-ups tracked in DESIGN.md §3.5 (animated exit, multi-select, popover motion promotion,
      end-of-row keyboard access).

### References

- https://ui.shadcn.com/docs/components/hover-card
- https://ark-ui.com/docs/components/tree-view
- https://ark-ui.com/docs/components/editable
