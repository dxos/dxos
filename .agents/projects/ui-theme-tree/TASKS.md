# ui-theme-tree — Tasks

_Resume: split into two PRs — #12858 (hover cards + embed/menu fixes) and #12873 (Ark tree rebuild,
branch `claude/tree-ark-rebuild-00e588`). Uncommitted: none. Last: tree work extracted from #12858._

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

## Phase 3.5: Review fixes (user, 2026-08-31)

- [x] **Branch disclosure now animates height** — `tree-disclose` keyframes animate `block-size: 0 → auto`
      via `interpolate-size: allow-keywords` (opacity carries the reveal where unsupported); gated by a
      DOM-insertion-time `data-animate` stamp so persisted-open branches don't animate on load.
      Exit stays instant (zag hides immediately; DESIGN.md §3.5).
- [x] **Chevron background fixed** — zag stamps `data-state=open` on the trigger, which the ghost
      button styled as an open menu trigger (`bg-input-bg`); overridden to transparent.
- [x] **Whole-tree focus ring removed** — `outline-none` on the tree container (machine parks focus
      there via tabIndex −1).
- [x] **Click inside a hover card pins it** — doc-level pointerdown inside `[data-dx-popover-content]`
      converts hover-open to pinned, so portaled menus/toolbars opened from the card can't trigger
      leave-to-close; verified 13/13 hover checks + 17/17 tree checks + all test suites green.

## Phase 4: Wrap-up

- [ ] **PR** — before/after screenshots in description (tree story + navtree pair captured in
      `temp/`), then `submit-pr`. Confirm with user whether hover-default ships app-wide at once.
- [ ] **Human drag check** — real DnD drop in the sidebar (native drag not automatable).
- [x] **Popover closes when clicking the card menu** — root precondition: the workspace resolves
      FOUR copies of `@radix-ui/react-dismissable-layer` (vendored Popover + DropdownMenu forks),
      so Radix's nested-layer registries are disjoint and a portaled-menu click reads as
      "outside". Deck `handleInteractOutside` now ignores pointer-downs inside
      `[data-radix-popper-content-wrapper]`/`[data-radix-menu-content]`. FOLLOW-UP: dedupe the
      dismissable-layer versions (pnpm catalog/overrides) so layer coordination works natively.
- [x] **Inline embed does not render on first document mount** — `useOperationInvoker()` SUSPENDS
      (capability wait) inside the block portal, and an un-bounded suspension held the whole
      editor tree un-committed until a view-mode toggle rebuilt it. Fixed twice over:
      `PreviewComponent` uses the optional capability, and `Editor.Blocks` wraps every portal in
      its own `Suspense` (plus `data-testid=editor.blocks.portal`). Story
      `MarkdownEditor — WithEmbed` + unit tests pin the first-mount path.
- [ ] Follow-ups tracked in DESIGN.md §3.5 (animated exit, multi-select, popover motion promotion,
      end-of-row keyboard access).

### References

- https://ui.shadcn.com/docs/components/hover-card
- https://ark-ui.com/docs/components/tree-view
- https://ark-ui.com/docs/components/editable
