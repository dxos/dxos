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
3. **Toolbar gap is `--nx-control-inset`** (was `--nx-gap-size`, superseded once IconButtons took an inset cell, 19):
   Buttons, Inputs and Select triggers in a toolbar take the same inline margin as an IconButton's cell, so any two
   adjacent items are three insets apart (6px at md); Toolbar `Test` asserts it at md and lg.
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
    wide, 2px thumb inset) filled with the accent when checked. Its hidden native checkbox takes `role=switch`
    (follow-up 21).
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
    `--nx-gap-size`, capped at 20rem, 2px from its trigger, opening after 300ms (`openDelay`), with an arrow (follow-up 32).
    Tabbing between triggers is fixed in `Tooltip.Trigger` (follow-up 20); IconButton uses it for its label (22).
18. ~~**Checkbox and Switch occupy an IconButton's cell**~~ (superseded by 19): the box/track was centred in a
    `--nx-control-size`-wide cell.
19. **IconButton, Checkbox and Switch occupy a block-sized cell** (`--nx-block-size` square, 32px at md). The visible
    IconButton stays control-sized and is inset by `--nx-control-inset` on every side (margin inside the part, so a
    stack's or Field's `margin-block` inset is the same value and the occupied height stays one block); the checkbox
    box and switch track are centred in the cell with inline margin. An IconButton's icon therefore sits at the same x
    as a rail Block's, and labels after a checkbox or switch align with icon-button rows. Trailing Blocks in
    `Field.Header`, `FieldSet.Legend` and `Card.Header` take the same visible box and inset, so they keep matching
    IconButtons; the occupied cell, not the visible box, ends at the control's edge.
20. **Tooltip focus swap.** zag (1.43.3, unchanged in 1.44.0) queues events per microtask: the old trigger's blur
    closes its tooltip first, which clears the shared open-tooltip store, and every closed tooltip reacts by queueing a
    `close` — landing after the new trigger's focus `open`. `Tooltip.Trigger` therefore prevents zag's blur handler
    and closes a task later, so the new tooltip claims the store first (and the old one closes through the store, as on
    hover). A catalog bump would not fix it.
21. **Switch claims `role=switch`**, an exception to decision 9's "roles only from machine props": Ark's hidden input
    is a native checkbox without the role, yet the zag switch machine does implement the switch contract (Space
    toggles, checked state), so the role is earned. The native `checked` state supplies `aria-checked` to assistive
    tech; no explicit attribute is set.
22. **Icon-only button labels show in a Tooltip** (IconButton until 36), not a native `title` (which would double it); `aria-label` still names
    the button and `showTooltip={false}` opts out (e.g. inside a caller's own `Tooltip.Trigger`). The button keeps an
    id owned by a Toolbar item or an `asChild` parent, so the Tooltip looks its trigger up by that id (`ids.trigger`);
    otherwise positioning would find no anchor, since the button's own `data-scope`/`data-part` win the merge.
23. **Published as `@dxos/react-ui/next`.** `src/next/index.ts` (the `Next` namespace plus `Size`/`SIZES`) is a
    vite entry (`dist/lib/next.mjs`); the rules ship as source CSS, `import '@dxos/react-ui/next/theme.css'`
    (`src/next/theme/index.css`, following ui-theme's `./tokens.css` `style`/`default` export), resolved by the
    consumer's CSS pipeline. `sideEffects` became `["*.css"]` so bundlers keep that import. `@zag-js/core` and
    `@zag-js/react` are runtime dependencies again, since the Toolbar machine is now reachable from a published entry.
24. **Textarea** is Ark `Field.Textarea` with Input's control styling: at least 3 `rows` (the default), first-line
    padding matching a single-line control, `resize: vertical`, and optional `autoResize` (Ark's `autoresize`, which
    measures from `height: auto`, so `rows` stays the minimum).
25. **DateInput** is a native `date | time | datetime-local` input (Ark `Field.Input`, so Field wiring applies) inside
    a control-styled row with a trailing calendar/clock Icon; the platform picker button is transparent and stretched
    over the Icon so clicking it still opens the native picker (Chromium/WebKit; Firefox keeps its own button). The
    focus ring and disabled dimming are drawn on the row from the input's state (`:has`). `data-testid` goes to the
    row, the ref to the input.
26. **Popover** is Ark Popover, portalled like Menu (explicit `size`, `level='popup'`, 2px gutter, mounted only while
    open), padded by `--nx-gap-size`; Header/Title/Description/CloseTrigger mirror Dialog. `CloseTrigger asChild`
    closes through the popover api rather than zag's close-trigger props, whose `aria-label="close"` would rename a
    child such as "Done".
27. **Combobox** is Ark Combobox over a flat option list (`ComboboxOption` = `SelectOption`): a control row holding
    the input and a control-square caret trigger, and a portalled listbox reusing Select's popup and item rules.
    Only typing narrows the list (`filter`, default case-insensitive label substring); a selection or clear resets
    it, so reopening shows every option. `Content` lists the filtered options itself unless given children, with an
    `empty` row.
28. **Tag** is a pill `calc(var(--nx-control-size) - 2 * var(--nx-control-inset))` tall in the size's label text,
    coloured by ui-theme's `--color-<hue>-surface`/`-fg` tokens with the current Tag's valence mapping (info cyan,
    success emerald, warning amber, error rose).
29. ~~**ToggleIconButton**~~ (superseded by 36: now `Next.Toggle`) is Ark Toggle (`asChild`) over IconButton, so `aria-pressed` comes from the zag toggle
    machine (decision 9) and the label Tooltip is IconButton's; pressed takes `--color-accent-bg`/`-fg`.
30. **Select option icons.** `SelectOption.icon` leads the item and, once selected, the trigger's value (read from
    the select context); the value text takes the free space so the caret stays at the end.
31. **Toolbar items claim no `id`.** The roving machine finds its items by `data-toolbar-item`, so it leaves `id` to
    the machine composing the element. A toolbar item id overwrote a Select trigger's, zag found no anchor, and the
    listbox rendered unpositioned at the viewport origin (likewise a Menu/Popover `asChild` trigger on a toolbar
    Button, and an Input's label `for`). `expectAnchoredBelow` (`testing.ts`) asserts gap and alignment in the
    Select, Combobox, Menu, Popover and Form stories.
32. **Tooltip and Popover arrows**, on by default (`arrow={false}` on `Content` drops them), as the current primitives
    show them. Ark's `Arrow`/`ArrowTip` sized `--arrow-size: calc(var(--nx-gap-size) + 2px)` and painted with the
    popup's `--surface-bg`, so the arrow reads as part of the popup. zag grows the gutter by half the arrow box; the
    tip is scaled by 1/√2 so its corners touch that box instead of overhanging it, keeping the tip exactly the 2px
    gutter from the trigger. `expectArrow` (`testing.ts`) asserts colour, side, span and tip gap.
33. **Tooltips open on hover (after the delay) and keyboard focus only.** zag opens without the delay while any
    tooltip is open, or was unmounted open (its shared store is never cleared), so a click right after entering a
    trigger opened the tooltip and closed it on `pointerdown`: a flash. `Tooltip.Trigger` blocks zag's pointer-move
    opening and runs the Root's `openDelay` from `pointerenter`; `pointerdown` cancels it and closes, and the trigger
    stays suppressed until the pointer leaves; a focus that is not `:focus-visible` never opens. The follow-up 20
    blur deferral is unchanged. Covered by Button `Test`.
34. **Button variants and valences** follow the current Button (ui-theme `button.css`) on the same tokens, as
    `data-variant`/`data-valence` rules in `theme/control.css`, for `Button` and so `Toggle` (36):

    | Variant       | Rest                                          | Hover                        |
    | ------------- | --------------------------------------------- | ---------------------------- |
    | `default`     | `--color-input-surface`                       | `--color-hover-surface`      |
    | `primary`     | `--color-accent-bg` / `--color-accent-fg`     | `--color-accent-bg-hover`    |
    | `ghost`       | transparent                                   | `--color-hover-surface`      |
    | `outline`     | transparent, 1px `--color-separator` border   | `--color-hover-surface`      |
    | `destructive` | `--color-error-bg` / `--color-accent-fg`      | `--color-error-bg-hover`     |
    | `valence`     | `--color-<valence>-bg` / `--color-inverse-fg` | `--color-<valence>-bg-hover` |

    `valence` is `neutral | info | success | warning | error` (ui-types `MessageValence`); without it the button
    adopts an enclosing surface's `--dx-valence-bg`/`-bg-hover` (a Banner), else neutral. Outline uses the separator
    rather than the current `--color-base-surface`, which vanishes on a base surface. The current `tag` variant is
    left to `Next.Tag`. Pressed Toggles keep the accent over any variant.

35. ~~**`IconButton iconOnly`** (default `true`)~~ (superseded by 36: `iconOnly` is opt-in on `Button`), as the current IconButton: `iconOnly={false}` renders the icon then
    the `label` as text, at control height with Button's padding and `--nx-gap-size` between them, not squared or
    inset; the text names it, so it has no `aria-label` and no Tooltip. `ToggleIconButton` passes it through.

36. **One `Button`; `Toggle` replaces ToggleIconButton** (supersedes the separate IconButton of 19, 22, 29 and 35).
    IconButton was a Button with an icon, and its `iconOnly={false}` form already was a Button with a leading icon,
    so the two differed only in content. `Next.Button` now takes `icon?` (leading), `iconEnd?` (trailing), `label?`
    (or `children`, which win) and `iconOnly?: true`, which requires `icon` and `label` and yields the square
    block-cell button of 19 (`data-square`), named by `aria-label` and labelled by a Tooltip (22; `showTooltip={false}`
    opts out). Variants and valences (34) apply to every form. The union type makes `label` required exactly when the
    text is hidden. Icons are spaced from the label by `--nx-gap-size`. `Next.Toggle` is Ark Toggle over this Button
    with the same icon/label/`iconOnly` API, so a text toggle ("Bold") needs no second component; `aria-pressed`
    still comes from the zag toggle machine. All parts emit `data-scope='button'`.

37. **One `Default` and one `Test` story per component.** `withSizes()` (`stories.tsx`) renders the story once per
    size, each in a labelled `level='base'` rail-gutter Container (`data-testid='size-<size>'`, found by `sizeRow`
    in `testing.ts`) that passes the row's `size` as an arg, so every `Default` shows all sizes without per-file
    scaffolding; portalled parts forward that arg to their own `size` (finding 9). Visual variants (states, valences,
    arrows, justify) are rows or args of the same story rather than extra stories, and a single `Test` play function
    holds every geometry, role and behaviour assertion for the component, ending with any overlay open unless it
    tests dismissal. A variants × sizes matrix decorator was not needed: variants render as a row per size.
    `components.stories.tsx`, `Form.stories.tsx` and `spike/*` keep their own layouts.

38. **Separator** is one 1px rule in `--color-separator` (`theme/separator.css`): horizontal it stretches across its
    track with an inset above and below; vertical it is control-tall with an inline inset, so a toolbar keeps three
    insets between any two neighbours. It claims `role=separator` (plus `aria-orientation` when vertical) unless
    `decorative`. `Menu.Separator` is Ark's part with the same rule; `Select.Separator` is always decorative, since a
    listbox owns only options and groups. `Toolbar.Separator` takes the axis across the toolbar's orientation and is
    not a roving item. Toolbar therefore became a namespace (`Toolbar.Root`), like every other composite.

39. **Text and layout parity.** `Typography truncate` keeps one block-tall line with an ellipsis and `tone='description'`
    takes `--color-description` (the current `Card.Text` variants). `Label srOnly` hides the label visually but keeps
    it naming its control. `Group fill` gives every child an equal share (`flex: 1 1 0`), which is also the stretch
    mode: a lone child (the current `Form.Submit`) spans the group, so no second prop. `Container gap` sets the row
    gap only (`none|sm|md|lg` = 0/0.25/0.5/0.75rem, the current `ColumnGap`), since columns are shared through subgrid
    and a column gap would move the parent's tracks. `Column.Section label` needs no part: an inheriting Container
    with `Typography asChild` on an `<h2>` is the section, and a `label` prop would add a sibling that `asChild`
    cannot carry. `Block` stays one block square: `square` is its only shape and `compact` would break the rail
    alignment it exists for. ScrollArea takes `orientation` (`vertical|horizontal|all`, ui-types `AllowedAxis`, the
    current values), `autoHide` (thumbs show on hover, through the thumbs' Tailwind group names), `snap` (mandatory on
    the scrolling axis) and `scrollbars={false}` (no overlay thumb and no native bar); a horizontal pane reserves no
    end-track width.

40. **Button and Toggle parity.** `Button hue` fills with a Tag's hue: the per-hue rules in `tag.css` now set
    `--nx-hue-bg`/`-fg` for `:is(.nx-tag, .nx-button)`, and a hued button's hover shifts brightness (0.94, 1.12 in dark),
    as the current `tag` variant does, since the tag palette has no hover step. `caretDown` appends a caret at 75% of the
    control icon, one inset from what it follows; an icon-only button with a caret, or `compact` (one inset of inline
    padding), gives up its square but keeps its inset cell. `tooltipSide` places the label Tooltip. `Toggle activeIcon`
    swaps the icon while pressed, read from the zag toggle context so uncontrolled toggles swap too; the current
    90° rotation is not copied, since a disclosure is a `Collapsible`. `Next.ToggleGroup` is Ark ToggleGroup over
    Buttons with the current `type='single'|'multiple'` value API: single is a `radiogroup` of `radio` items
    (`aria-checked`, styled like pressed), multiple a `group` of pressed toggles. `Toolbar.ToggleGroup` turns zag's
    roving off and drops the root's tab stop, so its items join the toolbar's roving set through Button's
    `useToolbarItem` and the toolbar's arrow handler moves over them.

41. **Field and Input parity.** `Field.Root validationValence` (ui-types `MessageValence`) is a `data-valence` on the
    field, resolved in CSS without context: the control (and a Select or Combobox trigger, whose roots take no box)
    takes a 1px inset line and its focus ring in `--color-<valence>-border`, the HelperText `--color-<valence>-text`,
    and `error` also sets `invalid` (unless given) so Ark's ErrorText shows and the control reports `aria-invalid`; a
    non-error message is therefore HelperText, not ErrorText. `Field.Label srOnly` matches `Label srOnly`. `Input start`
    and `end` render a control row like DateInput's (adornments in `--color-description`, a bare input, the ring as an
    outline from the input's `:focus-visible`), with `data-testid` on the row and the ref on the input; a trailing
    icon-only Button shrinks by one inset on each side so it fits the control height and ends one inset from the row's
    edge. `noAutoFill` sets `data-1p-ignore`; `variant='subdued'` drops the well.

42. **Select parity.** `Select.ItemGroup`/`ItemGroupLabel` are Ark's parts, the label sharing Menu's caption rule
    (`.nx-popup-group-label`). `SelectOption.iconHue` colours the option's icon in the item and trigger with a Tag
    hue's foreground (`Icon hue`, the current SelectField's `iconHue`). An Item's `children` replace its icon and label
    for custom content; the trigger still shows the option's `label`, which is also its typeahead text. `multiple` is
    Ark's, with `closeOnSelect` defaulting to off so the popup stays open while choosing; the trigger then lists the
    labels and shows an icon only for a single choice. `Select.Trigger loading` replaces the caret with a spinning
    icon (still under reduced motion) and sets `aria-busy`, for an async lookup. Values stay strings: Ark collections
    key by string, so SelectField keeps the map back to number literals (AUDIT 2.14).

43. **Toolbar parity.** `Toolbar.Root loop` (on by default) and `disabled` are machine props: a disabled toolbar
    marks the root `aria-disabled` and its item props add `disabled`, so every Button, Input, Select trigger and
    ToggleGroup item is disabled and none is a tab stop (a Link gets `aria-disabled` and ignores clicks, since `<a>`
    has no `disabled`). `Toolbar.Text` is non-item text that takes the free space and truncates. `Toolbar.Link` is a
    roving item, control-tall with a control's margin and padding so its ring matches a Button's, opening in a new
    tab like the current `Link`. `Toolbar.DragHandle` is a ghost icon-only Button with the six-dot grip, rendered
    outside the toolbar's context so it never joins the roving focus (a drag is a pointer gesture, AUDIT 2.6), with
    no Tooltip and a required `label` (AUDIT 2.10). The `useMenuActions` action-graph binding (`ActionIconButton`,
    `Toolbar.Menu`) waits for Phase 4, where react-ui-menu moves onto Next Menu.

44. **Menu parity.** `ContextTrigger`, `CheckboxItem`, `RadioGroup` (Ark's `RadioItemGroup`), `RadioItem` and
    `ItemIndicator` are Ark's parts. Option items lead with an icon-sized indicator cell (a check, or a dot for
    radio) that stays when unchecked, so their labels align with each other and with icon items. A nested menu is
    `Menu.Sub` (a Root inside a parent's Content, placed `right-start` with no gutter) opened by `Menu.SubTrigger`
    (Ark's `TriggerItem`, an item row with a trailing caret, highlighted while its menu is open); its Content is the
    ordinary `Menu.Content`. `Content arrow` draws Popover's arrow, off by default since menus usually have none. Ark
    has no virtual-trigger part: a menu without a Trigger opens under control and anchors through
    `positioning.getAnchorRect`, which the story and Test cover. The content caps itself at the positioner's
    `--available-height` and scrolls, replacing the current `Menu.Viewport`.

45. **Overlay parity.** Every portalled Content (Select, Combobox, Menu, Popover, Tooltip, Dialog) takes
    `container`, Ark's `Portal container`, which is also the first option of AUDIT 2.2 (portal into a sized scope).
    Popover passes `modal` through to zag and gains `Popover.Body`, a composed ScrollArea like `Dialog.Body` whose
    inset gutter replaces the panel's padding, while the panel caps itself at the positioner's `--available-height`.
    zag decides whether a popover has a title or description once, when its machine starts, which is before lazily
    mounted content exists, so a lazy popover was unnamed; `Popover.Title`/`Description` now register with their
    Content (a behaviour context), which sets `aria-labelledby`/`aria-describedby` itself. Ark has no virtual-trigger
    part: Popover and Menu anchor through `positioning.getAnchorRect` (Popover also has `Anchor`). `Tooltip.Trigger
content side` is the current shorthand: the trigger brings its own Root and Content, so `Next.Tooltip` stays a
    namespace. `Next.TextTooltip` is one ellipsizing line whose controlled tooltip opens only if the text is cut off,
    measured when it would open. `Next.AlertDialog` reuses the Dialog parts with `role=alertdialog` (zag keeps it open
    on an outside click); it focuses a control marked `DIALOG_AUTOFOCUS_ATTRIBUTE` (`data-autofocus`, which zag's own
    initial-focus lookup already honours in a Dialog), else `Cancel`; `Action` is a `primary` Button that closes after
    its handler unless the handler prevents default. Next ships no labels for Cancel or Action (AUDIT 2.10).

46. **Card parity.** `Card.Section` is an inheriting Container, a `group` named by its optional caption. `Card.Row`
    is its own small grid rather than a subgrid of the card: a fixed block-sized icon cell (fixed tracks align across
    subtrees, decision 5, so every row's text starts at the same x without the card defining columns that the narrow
    pane collapse would drop), the text truncating, and a trailing cell kept whole. A Root or Row with `onClick` is a
    `button`, activated by Enter and Space only when it is itself the target; `Card.Action` (a ghost icon-only
    Button), `Card.Link` and `Card.Menu` (a ghost ⋮ trigger with a sized Menu) stop their clicks so a clickable card is
    not activated through them. The current `Card.Action`, a full-row button, maps to `Card.Row onClick`; the new
    `Card.Action` is the icon-only one the header and rows need. `Card.Text` is Typography with the current
    `truncate`/`variant`. `selected` sets `data-selected` and `aria-current` with an accent border; `border={false}`
    hides the frame. `fullWidth` is not copied: a Next card fills its track and its host decides the width (6).
    `DragHandle` moved out of the Toolbar namespace into `Next.DragHandle`, shared as `Toolbar.DragHandle` and
    `Card.DragHandle`.

47. **Image parity.** `Image onClick` makes the frame a `button` named by the image's `alt`, activated by Enter and
    Space (`clickable.ts`, shared with clickable Cards and Card rows); its ring is an outline, since the image fills
    the frame and would cover an inset one. Dominant-colour sampling is deferred: the sampler is private to the current
    `Image`, so reusing it means moving it to a shared utility (a change to the current component, out of this
    scope), and it reads pixels in JS, which decision 11 keeps to the scroll thumbs. Until a decision, a `contain`
    frame shows the well around the image.

48. **A press suppresses the Tooltip only until the next focus or hover** (amends 33). The trigger kept its
    click suppression until `pointerleave`, so a missed leave (the pointer never left in the browser's eyes, or a
    synthetic click) left it suppressed for good: after clicking a Toggle and toggling it with Space, neither
    keyboard focus nor a later hover showed its label. `pointerenter` now clears the press (an enter is a fresh hover,
    so a press before it is stale), as do `keydown` (keyboard use) and `blur` (a later focus is judged on its own).
    Toggle `Test` reproduces it: click, Space, Tab away and back, then hover with the real pointer. zag ignores
    `setOpen(true)` while a tooltip is `closing`, so an `openDelay` shorter than zag's 150ms `closeDelay` could still
    swallow a quick re-hover; the 300ms default cannot.

49. **Scrolling regions always use `Next.ScrollArea`; popups use `width='thin'`** (amends 44 and 45). No Next part
    scrolls with `overflow: auto` and a native bar. Menu, Select and Combobox content sits in `PopupScroll`
    (`components/ScrollArea/PopupScroll.tsx`): the ScrollArea frame is the popup surface (`.nx-popup`,
    `data-surface='popup'`, `data-size`, capped at `min(--available-height, 20rem)`) and the Ark content is its
    viewport, because zag scrolls the highlighted item into view only when the content element itself overflows
    (`scrollIntoView` checks the root's `overflow`); an inner viewport would leave keyboard navigation stranded below
    the fold. The frame drops inline-size containment so the popup still sizes to its items, and draws Menu's arrow
    beside the viewport, whose overflow would clip it. Each content is wrapped in a `composable` part, since a plain
    Ark part under `asChild` gets the dev slot-warning wrapper (finding 5), which breaks the frame's child rules; the
    wrapper restates Ark's `data-scope`/`data-part`, which the viewport slot would replace (finding 10). Popover
    already scrolls through `Popover.Body`. `Toolbar.Root` is the viewport of a thin ScrollArea along its orientation
    whose bar shows on hover. `expectScrollingPopup` (`testing.ts`) asserts overflow, no native bar and a highlight
    kept in view in the Menu, Select and Combobox `Test`s; `popupFrame` finds the surface. The thumbs'
    ResizeObserver reports a benign "ResizeObserver loop" when a popup resizes with its reference in the same frame
    (the Select `multiple` case); vitest does not fail on it.

50. **Tooltip uses the inverted surface** (amends 17 and 32), as the current Tooltip (`Tooltip.theme.ts`): ui-theme's
    `--color-inverse-surface` fill and `--color-inverse-fg` text, dark on a light theme and light on a dark one. The
    content carries no `data-surface`: that attribute enters a level zone whose rule paints the popup fill, which the
    inversion would have to out-rank, and a tooltip is a deliberate flip rather than a rung on the level ladder, so it
    publishes no `--nx-level`. It still takes `.nx-popup` for size, radius and shadow, and publishes its fill as
    `--surface-bg`, so the arrow (which paints `--surface-bg`) needs no rule of its own. Tooltip `Test` asserts the fill
    and text match the tokens' computed colours and differ from `--dx-surface-popup`; `expectArrow` checks the arrow.

51. **`SystemButton` presets** port `SystemIconButton` (`Add`, `Ai`, `Bookmark`, `Clipboard`, `Close`, `Delete`,
    `Disclosure`, `Download`, `Edit`, `Mic`, `Star`, `Upload`) as `Next.SystemButton.*`: every preset is an icon-only
    `Next.Button` (or `Next.Toggle` for Star and Bookmark), so it takes Button's variant, valence, hue and Tooltip
    props but not `icon` or `iconOnly`. Labels default from react-ui's `system-button.*` translations via
    `useTranslation(translationKey)` — the first i18n in Next, so a story needs `parameters: { translations }` —
    and `label` overrides them. Star and Bookmark take Toggle's `pressed`/`defaultPressed`/`onPressedChange` and own
    the state (`useControllableState`) because the label, not only the icon, follows it. Disclosure is a Button with
    `aria-expanded` (`expanded`/`defaultExpanded`/`onExpandedChange`) and swaps caret-right for caret-down, since
    Next has no rotation (15). Colour classes became a `data-icon-valence` rule (`theme/system-button.css`): a
    pressed Star's glyph takes `--color-warning-text` and a landed copy's check `--color-success-text`; a recording
    Mic takes `hue='error'`. Clipboard is always icon-only, so its label always swaps to "Copied"; Mic keeps a
    required `label`, there being no translation for it. `SystemButton` `Test` covers names, geometry against a
    plain `Button iconOnly`, the toggles, `aria-expanded` and a stubbed clipboard write.

## Phase 3: react-ui-form port

Parity audit, Next shortcomings and the milestone plan for the react-ui-form and react-ui-list rewrites: [AUDIT.md](./AUDIT.md).

`@dxos/react-ui-form` (~155 importing files; public extension points `fieldMap`, `FormFieldRenderer`, `fieldProvider`,
`createSelectField`, `FormFieldRow`) is ported as a **parallel `react-ui-form/next`** with the same `Form.*` API and
renderer contract, rendered with `Next.*`, so plugins and their custom renderers migrate one at a time (decision 1's
parallel-namespace approach; no compatibility shims).

1. **Prerequisite:** export Next from `@dxos/react-ui` (a `next` subpath and its CSS).
2. **Field coverage.** Direct Next equivalents: Text, Password, Number, Tuple, GeoPoint, Boolean (Switch), Select/
   AsyncSelect, Autofill, InlineRef, nested groups (FieldSet + Collapsible + Tooltip), array add/remove (`Button iconOnly`).
   New components: `Textarea`, `DateInput`, `Popover` + `Combobox` (Ref/lookup), `Tag`, `Toggle` (was `ToggleIconButton`), optional
   `Banner`; Select needs option icons. Restyle only: HuePicker, the markdown editor, OrderedList, `DxAnchor`.
3. **Layout mapping.** `Form.Viewport` → `Next.Container gutter` + composed `Next.ScrollArea` (no Column helpers);
   `FormFieldRow` → `Field.Root` + `Field.Header` (error icon/Tooltip and array actions in the trailing slot);
   `labelPlacement: 'beside'` → Checkbox/Switch labels; `inline` hides the header; `static` renders Typography.
4. **Open decision:** `variant='settings'` (bordered two-column label/control grid, ~37 files) conflicts with decision
   13's label-above fields and needs a Container-`columns` settings layout.
5. **Order:** export → new components → `react-ui-form/next` core on ready fields (reusing the tested
   `resolveFieldRenderer`) → settings layout → Ref/lookup fields → pilot plugin.
6. **Wrapper focus rings are outlines.** Combobox, DateInput, Checkbox and Switch draw their ring on a wrapper with
   children that fill (the Combobox trigger, the Switch thumb), so they use an inset outline — outlines paint above
   descendants, inset shadows below. The FocusRings audit fails when an inset-shadow ring host has a filled child.
7. **Combobox Enter picks the first match.** `inputBehavior` defaults to `autohighlight`, so typing highlights the
   first matching option and Enter selects it.
