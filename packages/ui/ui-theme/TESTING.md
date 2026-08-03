# Testing guide — design-system audit branch

Companion to [`AUDIT.md`](./AUDIT.md), for reviewing PR #12434. That document explains _why_ each
change was made; this one is a checklist of _what to look at and what could plausibly be broken_.

**Scope:** 151 files, mostly `ui/react-ui` and `ui/ui-theme`, plus a mechanical class swap across
~40 plugin/app/story files. CI (build, test, storybook, lint, format) is green — so the risk here is
**visual and behavioural, not compile-time**. Every defect found during development was found by
looking at pixels, never by a test.

Fastest way to see everything at once:

```bash
moon run storybook-react:serve -- --port 9014 --no-open --ci
```

Then `ui/react-ui-core/playground/Elevation` (whole-app frame) and
`ui/react-ui-form/FormInCard` (grid alignment).

---

## 1. The deliberate visual change — elevation

**The app is meant to look different.** Chrome (sidebars, topbar, rails) now sits _below_ the
document canvas, and cards/panels sit _above_ it. Previously cards were the darkest surface in dark
mode and sidebars floated above the canvas; that is inverted.

Check in both light and dark:

- Sidebars and topbar recede; the canvas reads as the middle plane; cards lift off it.
- A dialog reads above the canvas, a popover/menu above the dialog.
- Nothing is invisible-on-invisible — particularly **a card on the canvas** and **an input inside a
  card**, which were the two pairs most at risk of collapsing to the same tone.

Where it will look wrong if it is wrong: `plugin-deck` panes and the L0/L1/R0/R1 rails, `plugin-navtree`
sidebar, and anything with a floating panel over a map/canvas.

## 2. Toolbars and wells are now relative, not fixed

Toolbars, groups and inputs no longer have one global colour — they take a step off **whichever
surface hosts them**. This is the change most likely to surprise.

- A toolbar in the sidebar and a toolbar on the canvas are now **intentionally different tones**.
  That is correct, not a bug.
- A toolbar inside a card should read as a bar _on that card_.
- Watch for a toolbar that has become nearly invisible against an unusual host, or a nested
  toolbar-in-toolbar (the second one deliberately does not compound the step).

## 3. Hover / selection / current states

These derive from the host surface, so they moved everywhere at once.

- Hover a row in: the navtree, a `Listbox`, a table, a menu, a card list, and a **toolbar**.
- Selected and current rows should be visible on _every_ surface, including inside dialogs and
  popovers.
- `--color-selected-surface` had been silently frozen to the root surface since it was introduced;
  selection highlights inside cards/dialogs will look different (correct) now.
- `plugin-code`'s FileTree row changed from `aria-pressed` to `aria-current` — check the selected
  file still highlights and screen-reader semantics read as "current".

## 4. Control sizes and density — 24 / 32 / 40

The scale is now three sizes; the old 28px step is gone. `xs` is an alias of `sm`.

- **Anything that was `sm` (28px) is now 24px** — visibly tighter. Check dense toolbars, the
  `Calendar` (nav buttons and day cells both moved), `Select` scroll buttons, and
  `input.triggerIcon`.
- **Menu items were 36px, now 32px** — check dropdown menus don't feel cramped.
- **PIN input segments** now follow density instead of their own four sizes.
- **Icon-only buttons are square by padding symmetry** (24/32/40). They previously carried a stray
  `px-2` that overrode every density — so icon buttons will be slightly narrower. They deliberately
  do NOT pin an inline size: a pinned width stops a button stretching to its grid cell, which left
  the R0 rail's sidebar toggle 4px off-centre from the tab buttons above it (fixed).
- **Density now cascades by CSS class.** `DensityProvider` renders a `display: contents` wrapper.
  Verify a `Toolbar density='sm'` actually shrinks its children (it never used to), and that no
  layout broke from the extra wrapper element — grid/flex parents are the place to look.

## 5. Grid alignment — forms inside cards and dialogs

A form hosted in a Card or Dialog now uses the host's content track instead of nesting its own
gutter grid.

- `ui/react-ui-form/FormInCard` is the reference: the card row, the form labels and the form inputs
  must share one left edge (34px).
- Check real call sites: `plugin-preview` FormCard/ExpandoCard, `plugin-trip` SegmentCard,
  `plugin-space` CreateObjectPanel, `plugin-thread` ChannelCreatePanel.
- Three hand-written workarounds for this problem exist in those files. They should now be
  redundant — but they have **not** been removed, so if a form looks _doubly_ inset, that is a
  leftover workaround to delete, not a regression in the mechanism.
- Scrolling forms (`Form.Viewport scroll`) deliberately still own a grid, because the gutter hosts
  the scrollbar. Check a long settings panel still scrolls with the scrollbar in the gutter.

## 6. Highest-risk regression to re-check

During development, one change **dropped every class from every `Card.Root`** — cards lost their
surface, border and width clamp — and it passed the type checker, 119 tests and CI. Only a
screenshot caught it. It is fixed, but it is the failure mode to watch for:

> Anywhere a `Column.Root asChild` / `Card.Root` renders, confirm the element actually has its
> classes (border, surface, max-width). A card that is suddenly full-bleed and borderless is this
> bug.

Cards appear in: plugin-inbox stacks, plugin-space collections, plugin-preview, masonry grids,
plugin-tasks, plugin-blogger, plugin-projects, plugin-thread.

## 7. Lower-risk mechanical changes

Quick sanity only:

- **`.dx-panel` → `.dx-callout`** — the hue-tinted callout, used in `MarkdownStream` prompt lines
  and Flex/Grid stories. Check a prompt bubble still renders.
- **13 dead colour classes replaced** (`bg-activeSurface` etc.). These previously rendered
  _nothing_, so affected spots (devtools SQLite panel, plugin-terra telemetry, plugin-code FileTree,
  react-ui-thread message) will now show a highlight that was silently missing.
- **14 `Panel.Content asChild` additions** — these remove a wrapper div. Check those articles still
  scroll: plugin-explorer, plugin-script notebook, plugin-tasks outline, plugin-video, plugin-space
  merge preview, plugin-assistant chat.
- **`ObjectHistory` and a `RoutineArticle` story** moved from a raw `overflow-y-auto` div to
  `ScrollArea` — check scrolling and that the themed scrollbar appears.
- **Rails lost a 1px fudge** (`--dx-rail-size` 49px → 48px). Check the topbar/sidebar rails still
  align with no 1px seam.

## 8. Known gaps — not regressions

Recorded in `AUDIT.md`; do not report these as bugs:

- `bg-base-surface/70` in two `plugin-terra` floating panels still uses a bare utility — alpha
  surfaces have no zone equivalent yet.
- Four CSS files still `@apply bg-*-surface` (`input.css`, `button.css`, `tag.css`, `size.css`);
  `@apply` cannot take a zone class.
- `Select`'s trigger keeps a bare utility — a zone class loses to `.dx-button[data-variant]` at
  equal layer.
- `lit-grid` rows stay at a hard-coded 32px (a JS constant, outside CSS).
- ~10 hand-rolled 3-track grids (`react-ui-thread`, `react-ui-chat`, `AppBar`, …) are unmigrated;
  they look the same as before.

## 9. If something looks wrong

The single most useful diagnostic — read the surface chain at the broken element:

```js
getComputedStyle($0).getPropertyValue('--surface-bg');
getComputedStyle($0).backgroundColor;
```

If `--surface-bg` is empty, the element is not inside a surface zone: an ancestor is painting with a
bare `bg-*-surface` instead of `dx-*-surface`/`data-surface`, and every state colour inside it is
deriving from the base fallback. That is the one-line explanation for most "the hover looks wrong
here" reports.
