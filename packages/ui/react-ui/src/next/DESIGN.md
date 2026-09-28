# UI Next

## Design Goals

- Best pracises for Ark, Tailwind
- React/Solid
- Themeable
- Responsive (esp. mobile)
- Performance
- Support 5 sizes (xs, sm, md, lg, xl)
- Support levels (elevation)
- Scrollareas without clipping
- Not require CSS overrides
- Fits into grid (Column)
- Respects ARIA roles (human/machine readable)
- Testable

## Decisions

1. **Scope.** A parallel namespace (`Next.*`) alongside the current primitives; plugins opt in per component and old
   primitives retire once unused. Only a subset of components is in scope, starting with those in the original
   experimental story (since replaced by `components.stories.tsx`): Container, Toolbar, Block, Icon, Input, Button, Typography.
2. **Sizes.** CSS is the source of truth: theme rules keyed by `[data-size=xs|sm|md|lg|xl]` define `--block-size`,
   `--line-height`, `--font-size`, `--icon-size`, `--gap-size`. `Container` only sets `data-size`; TS exports just
   the `Size` type and `SIZES` list. One icon scale serves rail Blocks and controls, with `md` at Tailwind's `size-4`:
   `--nx-icon-size` xs 0.75rem, sm 0.875rem, md 1rem, lg 1.25rem, xl 1.5rem. The metrics live in `theme/size.css`.
   Namespacing (provisional, to be renamed): rules match only `.nx-*` elements and variables are `--nx-*`, since
   `data-size`, `data-layout`, `--gutter`, `--icon-size` and `--line-height` are already used by current primitives.
3. **Framework neutrality.** Design for Solid, build React only, following Ark's layering: behavior in framework-neutral
   zag machines (Ark's where one exists, our own `@zag-js/core` machine otherwise), styling in CSS rules and plain class
   recipes, React as a thin binding. No React-only mechanisms (e.g. context) for size or level.
4. **Levels.** `data-level` sets surface, border and shadow variables for its subtree and is inherited like size;
   nested containers may step up (`+1`). Z-index is out of scope — stacking belongs to the portal/overlay layer.
5. **Grid.** One configurable `Container` replaces `Column`; rails, inner tracks, size and level are inherited, so
   nested components (forms, rows, sections) line up with their parent's gutters without placement helpers.
   - **Props.** `size`, `level`, `gutter` (`rail | inset | sm | md | lg | none | inherit`), `columns` (inner
     template, interior line names only), `layout` (`stack | row`); all rendered as `data-*` attributes resolved by
     CSS. `stack` places each child across the content track; `row` flows children through the inner tracks.
   - **Named lines.** A gutter Container lays out
     `[full-start] var(--gutter) [content-start] <columns> [content-end] var(--gutter) [full-end]`; children default
     to `content`, opt out with `full`; `Block rail='start|end'` places into the gutter at any depth.
   - **Gutter width.** Default `rail` sets `--gutter: var(--block-size)` so gutter Blocks fit at every size; `inset`
     uses `--gap-size`; named `sm/md/lg` tokens remain as layout overrides (dialogs, cards).
   - **Nesting.** Containers nest as direct children only (wrappers use `asChild`; dev-mode warning otherwise). A
     Container inheriting gutter and columns uses real `subgrid`, so even content-sized (`auto`) tracks align across
     levels; a Container setting its own gutter/columns starts a fresh template. Only fixed tracks align across
     separate subtrees (e.g. sibling scroll panes).
   - **Scrolling.** Composed, not a Container prop: `ScrollArea.Root > ScrollArea.Viewport asChild > Container`.
     The frame hosts the thumbs and becomes a subgrid when its viewport inherits (detected with `:has`); the
     viewport's gutter tracks are the padding, so the scrollbar sits in the end gutter. ScrollArea stays usable for
     non-grid content. The caller picks the trade-off:
     - `mode='overlay'` (default): the thumb paints over the end gutter; `mode='reserve'` takes the thumb's width out
       of the end track, keeping the content edge aligned but shifting end-rail Blocks inward.
     - `width='thin'` (default): a fixed 4px, which fits inside the rail Block's margin (`(block - icon) / 2`, at
       least 4px) at every size, so an overlay thumb never overlaps its icon; `width='regular'` (8px) may overlap it.
     - `native` uses the platform scrollbar and implies `reserve`.
   - **Responsive.** The pane is the query container: whatever hosts a column of content (Panel/plank, Dialog) sets
     `container-type: inline-size`, so every template root in it — header, body, footer — collapses at the same pane
     width; ScrollArea frames are containers too. A root cannot query its own width, and inheriting containers must
     never be query containers (containment disables subgrid). Below the threshold `rail` collapses to `inset`, rail
     Blocks hide, and `columns` stack to one track.
   - **Mapping.** `Column.Root` → gutter Container; `Column.Row`/`Section` → `gutter='inherit'` Container;
     `Column.Block` → `Block rail`; `Column.Center` → default placement.
6. **Spacing ownership.** Components own their inline padding; containers own the gaps between children; no component
   sets its own outer margin. `className` passes through as an escape hatch, but needing it is a design smell.
7. **First milestone.** Rebuild the story components on decisions 2–4 and 6 (Input/Button fill `--block-size`);
   Toolbar gets a zag roving-focus machine so it can claim `role=toolbar`; ARIA fixes (`aria-hidden` icons, labels);
   storybook play tests assert per-size alignment and roles. Container gains gutter/columns/layout and a composed
   ScrollArea per decision 5, exercised by a nested-form story (rails, gutter Blocks, scrollbar in the end gutter).
   No plugin adoption yet.
8. **Theming.** A theme only sets values: `--nx-*` variables plus ui-theme's color tokens (dark mode via
   `light-dark()`), applied globally or under a scope such as `[data-theme=…]`. Structure — grid, placement, the
   element tree — is not themeable. Class recipes are plain TS functions shared by the React and Solid bindings; they
   are fixed at build time, not swapped at runtime through context (unlike the current `tx()` theme functions).
   One theme therefore serves both bindings, provided they emit identical DOM (same elements, classes and `data-*`
   attributes); the shared recipes guarantee the classes, and a parity test should assert the rest.
9. **ARIA.** Interactive roles and `aria-*` state come only from zag machines (`api.get*Props()`), so a role is
   claimed only by code that implements its keyboard contract. Layout parts (Container, Block, ScrollArea) carry no
   role by default; callers add landmark or `group` roles explicitly. Icons are `aria-hidden` unless given a label.
10. **Testability.** Three hooks, one job each: every part forwards `data-testid` to its root (the only e2e
    target); every part emits Ark's `data-scope`/`data-part` (structural queries and the React/Solid parity test);
    storybook play tests assert geometry and ARIA roles.
11. **Performance.** Size, level, gutter and layout are attribute swaps resolved by CSS — never React context or
    re-renders; no JS layout measurement except the overlay scroll thumbs; container queries only at template roots.
    A benchmark story (e.g. 1,000 rows in a nested Container inside a ScrollArea) tracks render and layout cost, since
    deep subgrids and `:has` are the design's unmeasured risks.

12. **Control sizing.** Controls (Input, Button, IconButton, Select trigger) are shorter than the block
    and centred in it: `--nx-control-size: calc(var(--nx-block-size) - 2 * var(--nx-control-inset))`, with a per-size
    inset (provisional: xs 1px, sm 2px, md 2px, lg 3px, xl 3px; controls 18/20/28/34/42px). `--nx-control-icon` equals `--nx-icon-size` (one
    icon scale, decision 2), so an icon is the same size in a control as in a rail Block. The block stays the row height, so rails and Typography's first-line centring are unchanged.
    Illustrated in `spike/Choices.stories.tsx` (ControlSizing).
13. **Field layout.** Field is a part, not a container (containers are Container, Form, Toolbar). `Field.Root` is a
    flex stack placed in the content track: Label above the control, HelperText/ErrorText below. Labels do not share a
    column across fields; `columns` remains for other row layouts. Illustrated in `spike/Choices.stories.tsx`
    (FieldLayout).

## Spike findings

`spike/Spike.stories.tsx` (`playground/spike`) exercises decision 5 with play tests that measure alignment across a
header, top-level rows, a nested form and a nested scroll pane — all pass (Default, Native, Narrow, Sizes). The internal-scroll variant was removed once decision 5 settled on the composed API.

1. **Subgrid survives scrolling.** A scroll frame and its viewport can both be subgrids, so rows inside a nested scroll
   pane share the parent's rails and its content-sized (`auto`) label track.
2. **Containment breaks subgrid.** `container-type` makes a grid independent, so `subgrid` silently degrades to a
   standalone grid. Only template roots (and non-inheriting scroll frames) may be query containers.
3. **Edge line names are invalid in `columns`.** `[content-start] [label-start]` is two adjacent bracket groups, which
   invalidates the whole template; `columns` may carry interior names only (`auto [field-start] minmax(0,1fr)`).
4. **Native scrollbars.** Reserving the bar's width out of the end track keeps the content edge aligned with
   non-scrolling siblings, but rail-end Blocks in the scroll pane then overlap the bar; overlay thumbs overlap them too.
5. **`asChild` onto a non-composable element** gets the dev `dx-slot-warning` wrapper, which breaks direct nesting and
   the frame's `:has(> …)` subgrid detection — scroll composition must target a composable Container.
6. **`layout` (`stack | row`) is needed.** A stack places each child across the content track; a row flows children
   through the inner tracks, pinning the first non-rail child to `content-start` (`:nth-child(1 of :not([data-rail]))`).
   A row with more content children than inner tracks spills into the end rail and wraps, so `columns` must provide a
   track per content child (or the extra children belong in a nested flex group).
7. **Scroll API (decided: composed).** Both shapes work. Internal (`scroll` prop) must split one prop set across two elements —
   `classNames` to the frame, `ref`/data attributes to the viewport — and `asChild` becomes ambiguous. Composed
   (`ScrollArea.Root > ScrollArea.Viewport asChild > Container`) keeps one element per part, the frame detects an
   inheriting viewport in CSS (`:has`) with no coupling, and ScrollArea stays usable for non-grid content.
8. **Levels need no React context.** Absolute levels reuse ui-theme's `data-surface` zones, which already paint and
   re-derive every host aspect (hover, separators, placeholder, scrollbar). Each zone publishes `--nx-level` (its
   rung), and `level='+1'` resolves against the parent's rung with a style query
   (`@container style(--nx-level: 2) { … }`), since every element is a style container. Level is independent of
   rails: an inheriting (subgrid) container can lift its surface and keep the parent's tracks. Style queries on custom
   properties are Baseline: Chrome 111, Safari 18, Firefox 151 (May 2026).
9. **Portals leave the sized scope.** Portalled content (Select's listbox) inherits neither `data-size` nor level, so
   `Select.Content` takes its own `size` and sets `data-surface='popup'`; unsized, it falls back to the `:root`
   defaults (md). Deriving the trigger's size would need JS measurement or context, both ruled out by decision 3.
10. **`asChild` merges one element's parts.** `ScrollArea.Viewport asChild > Container` renders one element, whose
    `data-scope`/`data-part` are the Container's (the child wins); the viewport is identified by `.nx-scroll-viewport`.
11. **Controls in stacks.** A stack row has no block of its own, so the enclosing Container (or `Field.Root`) pads a
    direct control child out to a block with `margin-block: var(--nx-control-inset)`; a `row` Container is at least
    one block tall and centres its items. Both are container rules, keeping decision 6.
12. **Toolbar items join by hook.** The roving machine (`components/Toolbar/toolbar-machine.ts`) is framework-neutral; Button,
    IconButton, Input and Select.Trigger join the nearest Toolbar through React context carrying the machine's api
    (behaviour, not size or level, so decision 3 holds). Arrow/Home/End keys stay with a focused text input.

## Follow-ups (Phase 1 review)

1. **Form actions use `Next.Group`**, a plain flex run with no role (`justify` start|end|between). Toolbar is reserved
   for a real keyboard contract; a row Container needs a track per child.
2. **`Select.Content` keeps an explicit `size`.** Portalled content leaves the sized scope, and inferring the trigger's
   size would need React context or DOM measurement, both ruled out by decisions 3 and 11.
3. **Toolbar gap is `--nx-gap-size`**, the same spacing token as Group and Container gaps.
4. **`experimental.stories.tsx` removed**; `components.stories.tsx` covers it.
5. **Controls fill with the host-derived well** (`--color-input-surface`, a small lightness step off the hosting
   surface) instead of ui-theme's fixed `--color-input-bg`, so they stay close to whatever panel hosts them.
6. **Focus ring is Next's own**: `.nx-focus-ring` draws `--nx-focus-ring-width` (2px) in `--nx-focus-ring-color`
   (orange by default), so a theme recolours it by setting one variable; the Select popup uses the same variables as
   an outline so item highlights cannot cover it.
7. **Checkbox box is icon-sized** (`--nx-icon-size`, check mark at 75%), not control-sized; it stays centred in its block.
8. **Layout.** One folder per component under `components/` (`components/<Name>/<Name>.tsx` + `index.ts`, barrel at
   `components/index.ts`); `Next.tsx` assembles the namespace; `theme/`, `recipes.ts` and `sizes.ts` stay at the root.
9. **`Field.Header` is the label row**: a `size='sm'` block row (by default) holding the Label and optional trailing
   Icons/IconButtons, whose end aligns with the control's right edge. The label takes the row's own font.
10. **Dialog** is Ark Dialog: a portalled `level='raised'` surface over the scrim with an explicit `size` (finding 9);
    Header, Body (`Container gutter='md'` as a composed `ScrollArea` viewport) and Footer (`Group justify='end'`) share
    one gutter. The Body keeps ScrollArea's `data-scope` (finding 10), and Select mounts its popup on open so a modal
    dialog's one-time `aria-hidden` sweep does not hide it.
11. **Switch** is Ark Switch in a block-tall row like Checkbox, with an icon-tall track (`--nx-icon-size` high, 1.75×
    wide, 2px thumb inset) filled with the accent when checked. Ark exposes it as a native checkbox input (no
    `role=switch`, state via `checked` rather than `aria-checked`); decision 9 keeps us from adding the role ourselves.
12. **FieldSet** is Ark Fieldset: a borderless `<fieldset>` stacking its Fields with `--nx-gap-size`, headed by a
    Legend that is an sm label row like `Field.Header`. Ark passes only `disabled` down to Fields, so `Field.Root`
    also defaults `invalid` from the enclosing set.
13. **Image** is an `<img>` (required `alt`, lazy, async decode) in a frame with a fixed `aspectRatio` (16 / 9 by
    default) and `fit` (cover|contain), so layout does not shift while it loads; the frame shows the well until then
    and a broken-image Icon, named by `alt`, on error.
14. **Card** is a `gutter='md'` Container at `level='+1'` (one rung above whatever hosts it) with a separator border
    and `--radius-md`; Header, Body (an inheriting Container) and Footer (`Group justify='end'`) share its content
    edge. `Card.Poster` is an Image placed `full` across the gutters, flush with the card's top corners.
15. **Collapsible** is Ark Collapsible: a block-row Trigger (caret Indicator rotating 90° when open, then the label)
    over Content whose height animates from Ark's measured `--height`; both motions are off under
    `prefers-reduced-motion`. `aria-expanded` stays true until the closing animation ends.
16. **Menu** is Ark Menu, portalled like Select: `Menu.Content` takes an explicit `size`, sits at `level='popup'` 2px
    from its trigger and mounts only while open. Items are block rows (leading Icon, label, trailing shortcut in
    `--color-description`); the highlight is `--color-hover-surface` under the popup's outline focus ring.
17. **Tooltip** is Ark Tooltip: portalled text at `level='popup'` with an explicit `size` (`sm` by default), padded by
    `--nx-gap-size`, capped at 20rem, 2px from its trigger, opening after 300ms (`openDelay`) and without an arrow.
    Open issue: tabbing straight from one tooltip trigger to the next opens the second and closes it at once (zag
    1.43.3); pointer hover and the first keyboard focus behave. `IconButton`'s native `title` would double a Tooltip.
18. ~~**Checkbox and Switch occupy an IconButton's cell**~~ (superseded by 19): the box/track was centred in a
    `--nx-control-size`-wide cell.
19. **IconButton, Checkbox and Switch occupy a block-sized cell** (`--nx-block-size` square, 32px at md). The visible
    IconButton stays control-sized and is inset by `--nx-control-inset` on every side (margin inside the part, so a
    stack's or Field's `margin-block` inset is the same value and the occupied height stays one block); the checkbox
    box and switch track are centred in the cell with inline margin. An IconButton's icon therefore sits at the same x
    as a rail Block's, and labels after a checkbox or switch align with icon-button rows. Trailing Blocks in
    `Field.Header`, `FieldSet.Legend` and `Card.Header` take the same visible box and inset, so they keep matching
    IconButtons; the occupied cell, not the visible box, ends at the control's edge.

## Phase 3: react-ui-form port

`@dxos/react-ui-form` (~155 importing files; public extension points `fieldMap`, `FormFieldRenderer`, `fieldProvider`,
`createSelectField`, `FormFieldRow`) is ported as a **parallel `react-ui-form/next`** with the same `Form.*` API and
renderer contract, rendered with `Next.*`, so plugins and their custom renderers migrate one at a time (decision 1's
parallel-namespace approach; no compatibility shims).

1. **Prerequisite:** export Next from `@dxos/react-ui` (a `next` subpath and its CSS).
2. **Field coverage.** Direct Next equivalents: Text, Password, Number, Tuple, GeoPoint, Boolean (Switch), Select/
   AsyncSelect, Autofill, InlineRef, nested groups (FieldSet + Collapsible + Tooltip), array add/remove (IconButton).
   New components: `Textarea`, `DateInput`, `Popover` + `Combobox` (Ref/lookup), `Tag`, `ToggleIconButton`, optional
   `Banner`; Select needs option icons. Restyle only: HuePicker, the markdown editor, OrderedList, `DxAnchor`.
3. **Layout mapping.** `Form.Viewport` → `Next.Container gutter` + composed `Next.ScrollArea` (no Column helpers);
   `FormFieldRow` → `Field.Root` + `Field.Header` (error icon/Tooltip and array actions in the trailing slot);
   `labelPlacement: 'beside'` → Checkbox/Switch labels; `inline` hides the header; `static` renders Typography.
4. **Open decision:** `variant='settings'` (bordered two-column label/control grid, ~37 files) conflicts with decision
   13's label-above fields and needs a Container-`columns` settings layout.
5. **Order:** export → new components → `react-ui-form/next` core on ready fields (reusing the tested
   `resolveFieldRenderer`) → settings layout → Ref/lookup fields → pilot plugin.
