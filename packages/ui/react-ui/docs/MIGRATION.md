# Radix → Ark UI migration (plan)

**Status:** planning. Phase 0 (four hand-built components) is in flight on its own branch; nothing
else has started. Every number below was measured against this tree at `@ark-ui/react@5.39.1` /
`@zag-js/*@1.43.3` and the `@radix-ui/*` versions in the lockfile on 2026-09-02 — re-measure before
trusting a figure in a later quarter.

This document considers moving `@dxos/react-ui` — and the `@dxos/react-ui-*` packages that share
its scaffolding — from Radix Primitives to Ark UI. It inventories what each component is built on,
maps Radix's primitives onto Ark's and names the gaps, lists the Radix modules other packages depend
on, and lays out a phased plan whose early phases are worth doing whether or not the later ones ever
happen.

The premise: the [Tree rebuild](../../react-ui-list/docs/TREE.md) (#12873, #12890) put Ark in the
app because Radix has no tree. Once the Zag runtime is paid for, every further component we hand-build
that Ark ships is a recurring tax — and the [component inventory](#1-component-inventory) shows that
tax is larger than the Radix-backed surface it would replace.

---

## Summary

- **Both libraries are headless, ship no CSS, and take `className` on every part.** `tx()` and the
  `*.theme.ts` files carry over unchanged. Styling is not a cost of this migration.
- **Most of the Radix dependency is scaffolding, not behaviour.** Of ~230 `@radix-ui` imports under
  `packages/ui`, ~207 are `react-context`, `react-primitive`, `react-slot`, `react-compose-refs` and
  `react-use-controllable-state`. Those have nothing to do with Ark and can be owned in-repo in one
  small module — which is what unblocks removing `@radix-ui/*` from the 28 sibling packages.
- **Only 12 of `react-ui`'s 42 components wrap a Radix behavioural primitive.** Three of them —
  `Popover`, `Tooltip`, `Menu` — are not wrappers but _forks_: they compose `react-popper`,
  `react-dismissable-layer`, `react-focus-scope`, `react-presence` and `react-portal` directly and
  re-implement Radix's own content layer (700–940 LOC each). Those are the expensive ones, and they
  are also where Ark's machines would delete the most code.
- **Ark's anatomy exposes what Radix hides and hides what Radix exposes.** Radix buries the
  floating-ui positioner inside `Content` and exposes `Select.Viewport`; Ark exposes `Positioner` and
  has no viewport. Every floating component gains one node in the JSX and loses the `--radix-*`
  variables in favour of one generic Zag set.
- **The blast radius is bounded by the namespace API.** 1,136 files import `@dxos/react-ui`, but the
  `Foo.Root / Foo.Trigger / Foo.Content` surface is ours; where Ark's anatomy matches we change
  nothing downstream, and where it differs the consumers are counted per component below.
- **`Select` is the one component whose API leaks.** Ark's `Select` takes a required
  `collection: ListCollection<T>` prop instead of JSX children — 44 consumer files change shape.
- **`Calendar` and `DatePicker` are a separate decision.** They are built on `react-aria-components`,
  not by hand, and RAC is load-bearing in `Input`'s date/time fields and `react-ui-form`'s
  `DateField`. Consolidating a second headless library is a real choice, not a port.

---

## 1. Component inventory

Every directory under [`src/components/`](../src/components). _LOC_ excludes stories and tests.
_Built on_ names the behavioural dependency; "scaffolding" means only `react-context`,
`react-primitive`, `react-slot`, `react-compose-refs` or `react-use-controllable-state`, which are
not what a migration replaces.

| component       |  LOC | built on                                                                                     | Ark component                                                      | consumers¹ | verdict                                                                |
| --------------- | ---: | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ---------: | ---------------------------------------------------------------------- |
| AttentionGlyph  |  111 | scaffolding                                                                                  | —                                                                  |            | keep                                                                   |
| Avatars         |  217 | scaffolding (hand-built)                                                                     | `avatar`                                                           |            | port (leaf)                                                            |
| Banner          |  267 | scaffolding                                                                                  | —                                                                  |            | keep                                                                   |
| Breadcrumb      |  143 | scaffolding                                                                                  | —                                                                  |            | keep                                                                   |
| Button          |  810 | `react-toggle`, `react-toggle-group`                                                         | `toggle`, `toggle-group`                                           |            | port (leaf)                                                            |
| Calendar        |  286 | `react-aria-components`                                                                      | `date-picker` (view)                                               |         21 | **decision** — see §4                                                  |
| Card            |  772 | scaffolding                                                                                  | —                                                                  |            | keep                                                                   |
| Carousel        |  528 | hand-built (+ `@dxos/react-focus`)                                                           | `carousel`                                                         |          4 | **Phase 0, in flight**                                                 |
| Clipboard       |  124 | hand-built                                                                                   | `clipboard`                                                        |            | port (leaf)                                                            |
| Column          |  357 | scaffolding                                                                                  | —                                                                  |            | keep                                                                   |
| DatePicker      |  332 | `Calendar` + Radix `Popover`                                                                 | `date-picker`                                                      |          1 | **decision** — see §4                                                  |
| Deferred        |  118 | none                                                                                         | —                                                                  |            | keep                                                                   |
| Dialog          |  590 | `react-dialog`, `react-alert-dialog`                                                         | `dialog` (`role="alertdialog"` variant)                            |            | port                                                                   |
| Editable        |  427 | hand-built                                                                                   | `editable`                                                         |         13 | **Phase 0, in flight**                                                 |
| ErrorFallback   |  256 | `react-error-boundary`                                                                       | —                                                                  |            | keep                                                                   |
| Focus           |  255 | scaffolding                                                                                  | `focus-trap` (partial)                                             |            | keep — `@dxos/react-focus` owns this                                   |
| Icon            |  128 | scaffolding                                                                                  | —                                                                  |            | keep                                                                   |
| Image           |  257 | none                                                                                         | —                                                                  |            | keep                                                                   |
| Input           | 1247 | `react-checkbox` + RAC segmented fields                                                      | `checkbox`, `field`, `number-input`, `password-input`, `pin-input` |            | partial — checkbox is a leaf; date/time fields follow the RAC decision |
| Link            |   53 | scaffolding                                                                                  | —                                                                  |            | keep                                                                   |
| Main            |  615 | `react-dialog` (sidebars)                                                                    | `dialog` / `drawer`                                                |            | port with Dialog                                                       |
| MediaPlayer     |  196 | none                                                                                         | —                                                                  |            | keep                                                                   |
| Menu            |  896 | **fork** of `react-menu`, `dropdown-menu`, `context-menu`                                    | `menu` (one machine; `contextTrigger` part)                        |        29² | port (floating)                                                        |
| MenuButton      |  109 | `Menu`                                                                                       | —                                                                  |            | follows Menu                                                           |
| Panel           |  179 | scaffolding                                                                                  | —                                                                  |            | keep                                                                   |
| Popover         |  701 | **fork**: `popper`, `dismissable-layer`, `focus-scope`, `focus-guards`, `presence`, `portal` | `popover`                                                          |         38 | port (floating)                                                        |
| Progress        |   99 | hand-built                                                                                   | `progress`                                                         |            | port (leaf)                                                            |
| ScrollArea      |  529 | scaffolding (hand-built)                                                                     | `scroll-area`                                                      |            | port (leaf)                                                            |
| ScrollContainer |  362 | scaffolding                                                                                  | —                                                                  |            | keep                                                                   |
| Select          |  303 | `react-select`                                                                               | `select`                                                           |         44 | port — **API leaks** (collection prop)                                 |
| Separator       |   57 | `react-separator`                                                                            | —                                                                  |            | hand-roll (trivial)                                                    |
| Show            |  104 | none                                                                                         | —                                                                  |            | keep                                                                   |
| Skeleton        |   53 | none                                                                                         | —                                                                  |            | keep                                                                   |
| Slider          |  107 | `react-slider`                                                                               | `slider`                                                           |            | port (leaf)                                                            |
| Splitter        |  434 | scaffolding (hand-built)                                                                     | `splitter`                                                         |          8 | **Phase 0, in flight**                                                 |
| Stepper         |  330 | none (hand-built)                                                                            | `steps`                                                            |          3 | **Phase 0, in flight**                                                 |
| Tag             |   52 | scaffolding                                                                                  | —                                                                  |            | keep                                                                   |
| TextCrawl       |  312 | none                                                                                         | — (`marquee` differs)                                              |            | keep                                                                   |
| Toast           |  229 | `react-toast`                                                                                | `toast` (toaster-store model)                                      |            | port — model change                                                    |
| Toolbar         |  447 | `react-toolbar`, `react-toggle-group`                                                        | `toggle-group` only — **no toolbar**                               |            | roving focus → `@dxos/react-focus`                                     |
| Tooltip         |  942 | **fork**: `tooltip`, `popper`, `dismissable-layer`, `presence`, `portal`, `visually-hidden`  | `tooltip`                                                          |         35 | port (floating)                                                        |

¹ Consumer files outside the component's own directory, `dist`/`out` excluded; blank where not
measured. ² Counted as `DropdownMenu.` references.

Ark components with no counterpart in `react-ui`, for reference:

| Ark component     | in the repo today                                   | note                                          |
| ----------------- | --------------------------------------------------- | --------------------------------------------- |
| `accordion`       | `react-ui-list` — already on Ark                    | migrated on merit (APG keymap), see `TREE.md` |
| `collapsible`     | `react-list` on `@radix-ui/react-collapsible` (§3)  | leaf swap, Phase 2                            |
| `tabs`            | `react-ui-tabs` on `@radix-ui/react-tabs` (§3)      | leaf swap, Phase 2                            |
| `combobox`        | hand-built in `react-ui-list`                       | candidate, not obligation (+87.9 KB raw)      |
| `listbox`         | hand-built in `react-ui-list`                       | candidate, not obligation (+22.5 KB raw)      |
| `drawer`          | none — `Main`'s sidebars are Radix dialogs          | the missing mobile bottom sheet, Phase 4      |
| `tree-view`       | `react-ui-list` `Tree` — already on Ark             | the reason Ark is in the app                  |
| `hover-card`      | none                                                |                                               |
| `navigation-menu` | none                                                |                                               |
| `floating-panel`  | none                                                |                                               |
| `tour`            | none                                                |                                               |
| `tags-input`      | none                                                |                                               |
| `file-upload`     | none                                                |                                               |
| `number-input`    | none (`Input` has no numeric variant)               |                                               |
| `pin-input`       | `Input.PinInput` hand-built                         |                                               |
| `password-input`  | none                                                |                                               |
| `switch`          | `Input.Switch` hand-built                           |                                               |
| `rating-group`    | none                                                |                                               |
| `segment-group`   | none                                                |                                               |
| `pagination`      | none                                                |                                               |
| `color-picker`    | none                                                |                                               |
| `signature-pad`   | none                                                |                                               |
| `qr-code`         | none                                                |                                               |
| `timer`           | none                                                |                                               |
| `marquee`         | none (`TextCrawl` is a different thing)             |                                               |
| `image-cropper`   | none                                                |                                               |
| `json-tree-view`  | none (devtools has its own `ObjectsTree` on `Tree`) |                                               |
| `toc`             | none                                                |                                               |
| `angle-slider`    | none                                                |                                               |
| `cascade-select`  | none                                                |                                               |

---

## 2. Primitive mapping: Radix → Ark

### 2.1 Scaffolding

| Radix                                          |                                                                       uses³ | Ark                                                       | gap                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ---------------------------------------------- | --------------------------------------------------------------------------: | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `@radix-ui/react-context` `createContextScope` | 85 imports; 19 `createContextScope` calls in 10 files; 116 `__scope*` props | `createContext` from `@ark-ui/react/utils`                | **No scope concept.** Ark's answer to "which Popover does this Trigger belong to" is the machine: `Foo.RootProvider value={useFoo(...)}` plus `useFooContext()`. The `__scopeDropdownMenu` (42), `__scopeTooltip` (31), `__scopePopover` (28) and `__scopeSyntax` (12) props exist only because our forks re-implement Radix's internal scoping; they disappear with the forks. The `composite-components` skill's pattern needs updating either way.  |
| `@radix-ui/react-primitive` `Primitive.div` …  |                              270 uses (`div` 53, `span` 16, `button` 13, …) | `ark.div` … from `@ark-ui/react/factory`                  | Drop-in. Both accept `asChild`; `ark.*` also takes `asChild` on every anatomy part.                                                                                                                                                                                                                                                                                                                                                                    |
| `@radix-ui/react-slot` `Slot`, `asChild`       |                                             33 imports; 422 `asChild` sites | `asChild` on `ark.*` and every part                       | Same merge order and same className/style/handler rules, two differences — no `Slottable`, and an explicit `undefined` on the child no longer clears a slot prop. §2.6 has the full comparison and where our `slottable()`/`composable()` layer absorbs it.                                                                                                                                                                                            |
| `@radix-ui/react-compose-refs`                 |                                             17 imports (+ ~12 packages, §3) | **not public** — Ark's `composeRefs` is internal          | Own it. Ten lines, and React 19's ref-cleanup semantics are worth controlling ourselves.                                                                                                                                                                                                                                                                                                                                                               |
| `@radix-ui/react-use-controllable-state`       |                                             20 imports (+ ~14 packages, §3) | **not public** — Ark's `useControllableState` is internal | Own it. Same shape; ~30 lines.                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `@radix-ui/react-id` `useId`                   |                                                                           3 | `React.useId`                                             | Drop-in.                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `@radix-ui/react-visually-hidden`              |                                                               1 (+1 plugin) | `sr-only` class                                           | Drop-in.                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `@radix-ui/primitive` `composeEventHandlers`   |                                                                           3 | `mergeProps` from `@ark-ui/react/utils`                   | Not a drop-in. `composeEventHandlers` runs the caller's handler first and skips its own when `event.defaultPrevented` is set (unless `checkForDefaultPrevented: false`); Zag's `mergeProps` merges prop objects and always invokes both handlers — it never reads `defaultPrevented`. Keep a ten-line `composeEventHandlers` in the Phase 1 scaffolding module for the three sites that rely on the skip; `mergeProps` is for merging whole prop bags. |

³ Counted under `packages/ui`, `dist` excluded.

**What Ark actually exports as utilities** is small: `createContext`, `ariaAttr`, `dataAttr`,
`mergeProps` (`./utils`); the `ark` factory (`./factory`); `Presence`, `Portal`, `FocusTrap`,
`ClientOnly`, `Format`, `Frame`, `Highlight`, `Swap`, `DownloadTrigger` as components; and the
`environment`, `locale`, `hotkeys` and `interaction` providers. Everything else Zag has — dismissable
layers, interact-outside, focus trapping, scroll locking, `aria-hidden` management — lives inside
`@zag-js/*` packages that are dependencies of Ark but not re-exported from it.

The consequence: **the scaffolding layer should be ours, not Ark's.** A single internal module
(`compose-refs`, `use-controllable-state`, a context helper) removes the five Radix scaffolding
packages from every `@dxos/react-ui-*` package and 19 plugin files, costs nothing in bundle, and is
independent of whether any behavioural component ever moves. It is Phase 1 for that reason.

### 2.2 Structural parts

| Radix                                                                              | Ark                                                                                                                         | difference                                                                                                                                                                                                                                                                                                                                                                                |
| ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Positioner** — internal to `Content` (`react-popper` wraps it)                   | `Foo.Positioner` — a required, named part _around_ `Content`                                                                | Every floating component gains one JSX node. The floating-ui math, `--x`/`--y`, side/align data attributes and collision flipping live on it. Ours: [`Popover.tsx`](../src/components/Popover/Popover.tsx) and [`Tooltip.tsx`](../src/components/Tooltip/Tooltip.tsx) already render `PopperPrimitive.Content` themselves, so the node already exists in our forks — it just isn't named. |
| **Viewport** — `Select.Viewport` (scroll clip; Radix sets `overflow: auto` inline) | none — `Select.List`                                                                                                        | Ark declares no overflow; our theme must (`overflow-y-auto` on `List` or `Content`). Note `Popover.Viewport` and `Tooltip.Viewport` are **ours**, not Radix's — Radix has no such part there. They exist so the arrow can straddle `Content`'s edge without being clipped ([`Popover.theme.ts:15`](../src/components/Popover/Popover.theme.ts)). They survive a port untouched.           |
| `Dialog.Overlay`                                                                   | `Dialog.Backdrop`                                                                                                           | rename                                                                                                                                                                                                                                                                                                                                                                                    |
| `Dialog.Close` / `Popover.Close`                                                   | `Dialog.CloseTrigger` / `Popover.CloseTrigger`                                                                              | rename                                                                                                                                                                                                                                                                                                                                                                                    |
| `Select.Value`, `Select.Icon`                                                      | `Select.ValueText`, `Select.Indicator`; new `Select.Control` wrapper                                                        | rename + one node                                                                                                                                                                                                                                                                                                                                                                         |
| `Select.ScrollUpButton` / `ScrollDownButton`                                       | none                                                                                                                        | Zag relies on native scroll. Delete or hand-roll (8 consumer files use them).                                                                                                                                                                                                                                                                                                             |
| `Select.Arrow`                                                                     | none in `select` anatomy                                                                                                    | Delete.                                                                                                                                                                                                                                                                                                                                                                                   |
| `Arrow` (an `<svg>`, styled `fill-separator`)                                      | `Arrow` > `ArrowTip` (two `<div>`s, styled via `--arrow-background`, `--arrow-size`)                                        | Not a rename — a theme change per floating component.                                                                                                                                                                                                                                                                                                                                     |
| `Presence` (mount/unmount animation)                                               | `Presence` component, `lazyMount` / `unmountOnExit` props on every `Root`                                                   | Equivalent; Ark's is also the source of `data-state` + the `[data-animate]` hook the Tree uses for disclosure.                                                                                                                                                                                                                                                                            |
| `Portal`                                                                           | `Portal` (`@ark-ui/react/portal`)                                                                                           | Equivalent.                                                                                                                                                                                                                                                                                                                                                                               |
| `DismissableLayer`, `FocusScope`, `FocusGuards`                                    | inside the machine — `onInteractOutside`, `onPointerDownOutside`, `onFocusOutside`, `onEscapeKeyDown`; `trapFocus`, `modal` | Not composable primitives. A Radix-style fork that stacks its own layers is not possible on Ark; you configure the machine. This is exactly the code the `Popover`/`Tooltip`/`Menu` forks would delete.                                                                                                                                                                                   |
| `Toolbar` (roving tabindex)                                                        | none                                                                                                                        | `@dxos/react-focus` (#12884) already owns focus groups; Toolbar becomes a `toggle-group` inside a focus group.                                                                                                                                                                                                                                                                            |
| `AlertDialog`                                                                      | `Dialog` with `role="alertdialog"`                                                                                          | One prop.                                                                                                                                                                                                                                                                                                                                                                                 |
| Menu family: `Menu` + `DropdownMenu` + `ContextMenu` (three packages)              | `Menu` (one machine): `Trigger` for dropdown, `ContextTrigger` for context, `TriggerItem` for submenus                      | Collapses three of our imports into one.                                                                                                                                                                                                                                                                                                                                                  |

### 2.3 CSS variables

Radix namespaces per component; Zag sets one generic set on the positioner.
95 occurrences across 12 source files today, of which 20 are the aliasing blocks in
[`Tooltip.tsx:577`](../src/components/Tooltip/Tooltip.tsx),
[`Popover.tsx:489`](../src/components/Popover/Popover.tsx) and
[`DropdownMenu.tsx:281`](../src/components/Menu/DropdownMenu.tsx) that re-map `--radix-popper-*` onto
per-component names — those delete entirely.

| Radix                                                                                         | Zag                                              |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `--radix-popper-anchor-width`, `--radix-{select,popover,tooltip,dropdown-menu}-trigger-width` | `--reference-width`                              |
| `--radix-popper-anchor-height`, `…-trigger-height`                                            | `--reference-height`                             |
| `--radix-popper-available-height`, `…-content-available-height`                               | `--available-height`                             |
| `--radix-popper-available-width`, `…-content-available-width`                                 | `--available-width`                              |
| `--radix-popper-transform-origin`, `…-content-transform-origin`                               | `--transform-origin`                             |
| `--radix-accordion-content-height`                                                            | collapsible `--height`                           |
| `--radix-toast-swipe-end-x`, `--radix-toast-swipe-move-x`                                     | **none** — Zag's toast has its own gesture model |

External to `react-ui`: [`ui-theme/src/css/layout/size.css:53`](../../ui-theme/src/css/layout/size.css)
and [`ui-theme/src/css/theme/animation.css:110`](../../ui-theme/src/css/theme/animation.css).

### 2.4 State attributes

Both stamp state on the DOM as `data-*`, so variants are selectors in either library. Zag's are
richer: tree-view emits `data-branch data-checked data-depth data-disabled data-focus data-loading
data-path data-renaming data-selected data-state data-value`; select adds `data-highlighted
data-placement data-side data-placeholder-shown`. Only 11 `data-[…]` Tailwind selectors exist across
`ui-theme` + `react-ui` today, none of them Radix state names, so nothing here breaks.

Every Ark part also carries `data-scope="<component>" data-part="<part>"`, and
`createAnatomy(...).build()` returns a ready-made selector per part. That is how Park UI and Panda
skin Ark from a stylesheet. We won't use it — `tx()` is the className path — but it is why no styling
adapter is needed.

### 2.5 Behavioural differences worth knowing before touching a machine

- **Controlled props set machine state, not DOM state.** `TreeView`'s `focusedValue` does not move
  DOM focus; the machine only moves focus on its own events. This cost three attempts on the Tree
  ([`TREE.md`](../../react-ui-list/docs/TREE.md)). Imperative focus is done by hand, keyed on a stable
  element attribute (`data-object-id`), never on a path or index a reorder can change.
- **Ark's hooks are barrel-only, and eager imports are expensive.** Importing `@ark-ui/react` at the
  top level pulled ~60 Ark + ~61 Zag modules into the boot graph when tried for hotkeys
  (`react-focus` project notes). Always import the subpath: `@ark-ui/react/tree-view`, never
  `@ark-ui/react`.
- **The shared runtime is already paid for.** The Tree bought the ~24.5 KB raw Zag core; marginal
  cost per further component is single-digit KB gzip (`Tabs` 12.7 → `Tabs`+`TreeView` 25.6 KB gzip,
  i.e. `TreeView` marginal 12.9 KB). Do not re-argue wider adoption as a bundle saving; it is not one,
  and it is not a cost either.
- **Touch.** Zag handles `pointerType`/touch in 17 machines; Radix in 6 packages. Under Tauri mobile
  (WKWebView) that matters, and `drawer` is the component that has no Radix answer at all.

---

### 2.6 Slots and `asChild`

Both libraries answer the same question — "render my behaviour onto the element you give me instead
of the one I would create" — with an `asChild` prop that clones the single child and merges the
part's props into it. The mechanics differ in three places that matter to us, and our own
`slottable()`/`composable()` layer is where they get absorbed.

**What each does**, read from the installed sources
(`@radix-ui/react-slot@1.0.1` `Slot.tsx`; `@ark-ui/react@5.39.1` `factory.ts` over
`@zag-js/core` `merge-props`):

| concern         | Radix `Slot`                                                                    | Ark `ark.*` / every part (`asChild`)                                                                         |
| --------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| what it clones  | the single valid element child                                                  | the single valid element child (a `React.lazy` element is unwrapped); otherwise renders `null`               |
| `className`     | `[slot, child].join(' ')`                                                       | `clsx(slot, child)` — same order, trimmed; neither de-duplicates                                             |
| `style`         | `{ ...slot, ...child }`                                                         | same; also accepts string styles and merges them                                                             |
| `on*` handlers  | both exist → `child(...)` then `slot(...)`; slot-only → slot's                  | `callAll(child, slot)` — identical order                                                                     |
| other props     | child overrides, **including an explicit `undefined`**                          | child overrides **only when defined**; an `undefined` child prop keeps the slot's value                      |
| `ref`           | `composeRefs(forwarded, child.ref)`                                             | `useComposedRefs(forwarded, childRef)`; reads React 19's `props.ref` or the legacy `element.ref`             |
| `Slottable`     | marks which child is the merge target so siblings render alongside it           | **none** — `asChild` demands exactly one element child                                                       |
| where it lives  | a standalone `<Slot>` you compose, plus `Primitive.<tag>` which takes `asChild` | `ark.<tag>` factory (`withAsChild`, `memo(forwardRef)`), and every anatomy part takes `asChild` the same way |
| part attributes | none                                                                            | `data-scope`/`data-part` ride the merge onto the child, so it stays addressable as the part                  |

**What we have on top.** 422 `asChild` sites, almost all on _our_ namespaces — `Panel` 277,
`Dialog` 34, `Focus` 31, `Menu` 26, `Popover` 22, `Mosaic` 19, `DropdownMenu` 19, `Toolbar` 17,
`Tooltip` 14 — and only 11 directly on a Radix primitive (`ToolbarPrimitive` 8,
`ToggleGroupPrimitive` 3). Those namespaces are built with two factories in
[`react-ui/src/util/slots.ts`](../src/util/slots.ts): `slottable()` (20 files) for parts that accept
`asChild`, `composable()` (51 files) for leaves, over `SlottableProps`/`ComposableProps` from
`@dxos/ui-types`. `composableProps()` reconciles the `className` a slot merge injects with our
`classNames` prop, and a dev-only `COMPOSABLE` marker paints `dx-slot-warning` on an `asChild`
child that is not composable — the case where a slot's props are silently dropped. Radix's
`Slottable` is used twice: `Tooltip` and `ScrollArea` (thumbs rendered beside the slotted child).

**What the migration changes.**

- **The factories move, the call sites don't.** `slottable()`'s `asChild ? Slot : Primitive.div`
  becomes `ark.div` (which takes `asChild` itself), and `composable()` renders `ark.<tag>`. That is
  the whole swap for the 422 sites; it lands in Phase 1 with the rest of the scaffolding, and it is
  what lets `@radix-ui/react-slot` and `react-primitive` leave every sibling package.
- **`Slottable` has no Ark equivalent.** `Tooltip` and `ScrollArea` restructure so the sibling
  content is rendered by the part rather than passed through the slot — or keep a 40-line local
  `Slot`+`Slottable` (Radix's is that small). Decide per component in its own phase (Tooltip in 3,
  ScrollArea in 2); do not carry a global shim.
- **The `undefined`-override difference** is the one semantic change. A consumer that clears a
  slot prop by passing `prop={undefined}` on the child keeps the slot's value under Ark. No known
  site relies on it; grep `={undefined}` under an `asChild` child during Phase 1 and treat any hit
  as a bug in the consumer either way.
- **Handler order is the same in both**, and in neither does a child's `stopPropagation` prevent
  the slot's own handler — both are called. Our row-and-inner-control pattern relies on React's
  event propagation between _elements_, not on merge order, so it is unaffected; the focus-follows
  guard in `Tree` is the precedent for what does need code.
- **`memo` on every Ark part.** An `asChild` child element with a new identity per render bypasses
  it, exactly as with Radix; nothing to do, but not a performance win to advertise.
- **`data-part` on consumer elements** is new: under `asChild` the consumer's element becomes the
  part for CSS purposes. Harmless with `tx()` (className-driven), and it is what would make a
  stylesheet-level skin possible later.

The dev diagnostic, `composableProps()` and the `SlottableProps`/`ComposableProps` types are ours
and survive unchanged; the `composite-components` skill's example (`asChild ? Slot : Primitive.div`)
is the only documentation that needs its line rewritten.

## 3. Radix modules used outside `react-ui`

`grep -rho "@radix-ui/[a-z-]*" <pkg>/src`, stories excluded. Every entry is scaffolding except the
three marked **behavioural**.

| package                                                                                                                | `react-context` | `use-controllable-state` | `compose-refs` | `slot` | `primitive` | behavioural                                                                         |
| ---------------------------------------------------------------------------------------------------------------------- | --------------: | -----------------------: | -------------: | -----: | ----------: | ----------------------------------------------------------------------------------- |
| react-ui-mosaic                                                                                                        |               4 |                        1 |              5 |      3 |           3 |                                                                                     |
| react-ui-list                                                                                                          |               7 |                        1 |                |      1 |             |                                                                                     |
| react-primitives/react-list                                                                                            |               2 |                        1 |                |      1 |           3 | **`collapsible` (2), `checkbox` (1)**                                               |
| react-primitives/react-input                                                                                           |               1 |                          |                |      1 |           2 |                                                                                     |
| react-ui-dashboard                                                                                                     |               1 |                        1 |                |      1 |           1 |                                                                                     |
| react-ui-tabs                                                                                                          |               1 |                        1 |                |      1 |             | **`tabs` (1)**                                                                      |
| react-ui-attention                                                                                                     |               2 |                          |                |      1 |           1 |                                                                                     |
| react-ui-editor                                                                                                        |               2 |                        1 |                |        |             |                                                                                     |
| react-ui-menu                                                                                                          |               1 |                        2 |                |        |             |                                                                                     |
| react-ui-pickers                                                                                                       |                 |                        2 |                |        |             |                                                                                     |
| react-ui-search                                                                                                        |               1 |                        1 |                |        |             |                                                                                     |
| react-ui-grid                                                                                                          |               1 |                        1 |                |        |             |                                                                                     |
| react-ui-dnd                                                                                                           |               1 |                        1 |                |        |             |                                                                                     |
| react-ui-board                                                                                                         |               1 |                          |              1 |        |             |                                                                                     |
| react-ui-diagram                                                                                                       |               1 |                          |              1 |        |             |                                                                                     |
| react-ui-task                                                                                                          |               1 |                          |              1 |        |             |                                                                                     |
| react-primitives/react-hooks                                                                                           |                 |                          |              1 |        |             |                                                                                     |
| react-ui-assistant, -chat                                                                                              |          2 each |                          |                |        |             |                                                                                     |
| react-ui-calendar, -components, -debug, -feed, -form, -gameboard, -geo, -masonry, -syntax-highlighter, -table, -thread |          1 each |                          |                |        |             |                                                                                     |
| **plugins / apps / sdk** (28 files)                                                                                    |              19 |                        3 |              9 |      5 |             | `tooltip`, `toolbar`, `toggle-group`, `toggle`, `toast`, `visually-hidden` — 1 each |

**Gap analysis.**

- **Scaffolding (every row).** 28 `react-ui-*` packages and 28 plugin/app/sdk files depend on Radix
  for `createContext`, `composeRefs`, `useControllableState`, `Slot` and `Primitive`. None of that is
  behaviour, and Ark publicly exports only `createContext` and the `ark` factory. The fix is an
  in-repo module, not Ark; see Phase 1. Until it exists, `@radix-ui/*` cannot leave the catalog no
  matter how many components move.
- **`react-list` — `collapsible` + `checkbox`.** Ark has both machines. `Collapsible` is a leaf swap;
  `Checkbox` shares its migration with `Input`. `react-list` is the lowest tier (`react-primitives`),
  so it moves in Phase 2 with the other leaves.
- **`react-ui-tabs` — `tabs`.** Ark `Tabs` anatomy (`Root/List/Trigger/Content/Indicator`) is a
  near-match for Radix's; the only addition is the optional `Indicator`. Leaf swap.
- **Plugin-level behavioural imports** (`plugin-*` reaching for `@radix-ui/react-tooltip`, `-toolbar`,
  `-toggle-group`, `-toggle`, `-toast` directly) are pre-existing layering violations — a plugin
  should consume `@dxos/react-ui`'s namespace, not Radix's. They are fixed by re-pointing at
  `@dxos/react-ui` regardless of the migration, and should be, in Phase 1.
- **`react-ui-list`'s `Combobox` and `Listbox`** are hand-built on scaffolding and have Ark machines
  (`combobox` +87.9 KB raw, `listbox` +22.5 KB raw marginal — measured in the `ark` project). They are
  candidates, not obligations, and sit outside `react-ui`; listed for completeness.

---

## 4. Phased plan

Each phase is independently landable and leaves the tree consistent. Phases 1–2 are worth doing even
if 3–5 never happen. Verification gate for every phase: `moon run <pkg>:build`, `moon run :lint --
--fix`, the affected stories rendered with a clean console, and the consuming packages' tests.

### Phase 0 — hand-built components with Ark machines _(in flight)_

`Carousel`, `Editable`, `Splitter`, `Stepper` → `carousel`, `editable`, `splitter`, `steps`.
~2,264 LOC of hand-maintained interaction and a11y, no Radix behavioural dependency, consumer counts
4 / 13 / 8 / 3. Adds `@ark-ui/react` to `react-ui`'s dependencies (catalog). Order: Stepper →
Editable → Splitter → Carousel (Carousel also imports `@dxos/react-focus`).

Deliverable: one PR, `react-ui: rebuild Carousel, Editable, Splitter and Stepper on Ark UI`.

### Phase 1 — own the scaffolding

Create the replacements for the five Radix scaffolding packages inside `react-primitives`
(`react-hooks` already holds `compose-refs`'s single use there):

- `composeRefs` — ten lines, React 19 cleanup-aware.
- `useControllableState` — same signature as Radix's.
- `createContext` — decide between Ark's (no scope) and a scoped variant. Recommendation: **no
  scope**. The 116 `__scope*` props exist only inside the `Popover`/`Tooltip`/`Menu` forks that Phase
  3 deletes, and `react-ui-syntax-highlighter`'s 12 can move to a plain context.
- `ark.*` for `Primitive.*` — 270 sites, mechanical. Requires `@ark-ui/react` as a dependency of
  every package that uses it; alternatively keep a local `Primitive` shim over `ark`. Recommendation:
  import `@ark-ui/react/factory` directly — it is one module.

Sweep the 28 `react-ui-*` packages and 28 plugin/app/sdk files. Re-point the plugin-level
behavioural imports at `@dxos/react-ui`. Update the `composite-components` skill.

Outcome: `@radix-ui/react-context`, `-primitive`, `-slot`, `-compose-refs`, `-use-controllable-state`
and `-id` leave every `package.json` except `react-ui`'s. Zero anatomy change, zero consumer change.

### Phase 2 — leaves: behavioural swaps with no anatomy leak

Each is a single component whose Ark anatomy matches ours closely enough that the namespace API
holds. One PR each or small batches:

| component                  | Ark                      | note                                                            |
| -------------------------- | ------------------------ | --------------------------------------------------------------- |
| `Slider`                   | `slider`                 | 107 LOC                                                         |
| `Progress`                 | `progress`               | hand-built today                                                |
| `Clipboard`                | `clipboard`              | hand-built today                                                |
| `Avatars`                  | `avatar`                 | hand-built today; `Avatar.Fallback` semantics match             |
| `ScrollArea`               | `scroll-area`            | hand-built; Ark's has `viewport/content/scrollbar/thumb/corner` |
| `Button` toggle variants   | `toggle`, `toggle-group` | also removes `react-toggle-group` from `Toolbar`                |
| `Input.Checkbox`           | `checkbox`               | shares with `react-list`                                        |
| `react-list` `Collapsible` | `collapsible`            | `react-primitives` tier                                         |
| `react-ui-tabs`            | `tabs`                   | optional `Indicator` gained                                     |
| `Separator`                | —                        | hand-roll: a `div role="separator"` with `aria-orientation`     |

### Phase 3 — floating: the forks

The three forks — `Tooltip` (942 LOC), `Popover` (701), `Menu` (896) — are the heart of the
migration and the largest deletion. Each currently reimplements Radix's content layer from `popper`,
`dismissable-layer`, `focus-scope`, `presence` and `portal`; on Ark that logic is the machine, and the
component becomes anatomy + theme.

Order: **Tooltip → Popover → Menu**, so the positioner pattern, the `Arrow`/`ArrowTip` theme change
and the CSS-variable rename are settled on the smallest fork first.

- Add `Positioner`; keep our `Viewport` (it is ours, and its clipping rationale still holds).
- Rename the five `--radix-*` variables per §2.3; delete the three aliasing blocks.
- `Arrow` → `Arrow` + `ArrowTip`, `fill-separator` → `--arrow-background`.
- `DropdownMenu` + `ContextMenu` collapse onto one `Menu` machine with `ContextTrigger`.
- `MenuButton` and `react-ui-menu` follow `Menu`.
- Retire `__scopeTooltip`/`__scopePopover`/`__scopeDropdownMenu` with the forks.

Consumer exposure: Tooltip 35 files, Popover 38, DropdownMenu 29 — but only sites rendering an
`Arrow` or reading a `--radix-*` variable change; the namespace API holds otherwise.

Outcome: `react-popper`, `-dismissable-layer`, `-focus-scope`, `-focus-guards`, `-presence`,
`-portal`, `-tooltip`, `-menu`, `-dropdown-menu`, `-context-menu` leave `react-ui`. Also
`aria-hidden` and `react-remove-scroll`, which only the Popover fork imports.

### Phase 4 — modal, toast, select

- **`Dialog` + `Main`** → `dialog`. `Overlay` → `Backdrop`, `Close` → `CloseTrigger`, `AlertDialog`
  → `role="alertdialog"`. `Main`'s sidebars are Radix dialogs today; evaluate `drawer` for them —
  it is also the missing mobile bottom-sheet. Acceptance: a dialog rendered without
  `Dialog.Description` carries **no** `aria-describedby`. `Dialog.Content` forces
  `aria-describedby={undefined}` today to keep Radix from pointing it at a missing id; Ark omits the
  attribute when the part is absent, so the contract holds by default — verify it in the story for
  the no-description case rather than assuming it.
- **`Toast`** → `toast`. Model change: Ark's is a `createToaster()` store with a `Toaster` host,
  not a provider-plus-`Toast.Root` tree. The `--radix-toast-swipe-*` animation in
  `animation.css:164` has no equivalent and is replaced by Zag's gesture handling.
- **`Select`** → `select`. The one API leak: required `collection: ListCollection<T>`, plus
  `Control`, `ValueText`, `Indicator`, `Positioner`, `List`; `ScrollUpButton`/`ScrollDownButton`/
  `Arrow` deleted. 44 consumer files, 39 using `Viewport`, 8 using the scroll buttons. Decide up front
  whether `Select.Option` keeps a children-driven convenience layer that builds the collection from
  JSX, so most consumers change one import and nothing else.

### Phase 5 — decisions, not ports

- **`Calendar` / `DatePicker` / RAC.** `react-aria-components` backs `Calendar`, `Input`'s
  `Date`/`Time`/`DateTime` segmented fields, `SegmentedInput`, `react-ui-form`'s `DateField`, and the
  `withTheme` decorator installs its `I18nProvider`. Ark's `date-picker` covers the calendar and
  input (`date-input`) but not RAC's segmented-field model one-for-one. Options: (a) keep RAC as a
  second headless library for the date/time cluster and stop there; (b) consolidate onto Ark and
  rebuild the segmented fields. Not decided; (a) is the default until someone needs (b).
- **`Toolbar`.** Ark has no toolbar. Roving focus is `@dxos/react-focus`'s job since #12884;
  `Toolbar` becomes a focus group containing Ark `toggle-group`s. Decide whether the `Toolbar.*`
  namespace survives as a thin composition or is retired in favour of `Flex` + focus group.
- **`Focus`.** Keep; it is the seam between `react-ui` and `@dxos/react-focus`, and Ark's
  `focus-trap` covers only the trapping half.

### Phase 6 — remove Radix

When `react-ui`'s remaining `@radix-ui/*` imports are gone, remove the packages from the catalog and
lockfile, and delete `@radix-ui/react-select`'s `Viewport`-shaped theme slots. `pnpm knip` is the
gate — it caught the orphaned `react-compose-refs` after the Tree's flat row was deleted, and will
catch anything left behind here.

---

## Appendix A — measurements

Bundle, esbuild `--bundle --minify --format=esm`, React external, gzip:

| entry                                      |    gzip |
| ------------------------------------------ | ------: |
| Radix `Tabs`                               |  4.9 KB |
| Ark `Tabs`                                 | 12.7 KB |
| Radix `Dialog`                             | 11.2 KB |
| Ark `Dialog`                               | 19.9 KB |
| Ark `TreeView`                             | 20.0 KB |
| Radix `Tabs`+`Dialog`                      | 13.5 KB |
| Ark `Tabs`+`TreeView`                      | 25.6 KB |
| Radix × 4 (tabs, dialog, popover, tooltip) | 30.6 KB |
| Ark × 4 (same)                             | 41.2 KB |
| Ark whole barrel                           |  297 KB |

Derived: shared core ≈ 7.1 KB gzip (Ark) vs ≈ 2.6 KB (Radix); marginal per component 6–13 KB (Ark)
vs 4–11 KB (Radix). In-app, the Tree's landed cost was +82,205 bytes total JS (+0.12%), +1,652 in
the eager boot graph.

Maintenance, 2026-09-02:

|                                       | Ark / Zag            | Radix                           |
| ------------------------------------- | -------------------- | ------------------------------- |
| stars                                 | 5.4k / 5.2k          | 19.2k                           |
| weekly downloads                      | 1.05M                | 71.4M (`react-dialog`)          |
| open issues + PRs                     | 8 / 22               | 347                             |
| releases, last 12 / 6 / 3 mo          | 31 / 12 / 7          | 9 / 9 / 9                       |
| longest release gap, 3 yr             | 56 d                 | 296 d (2025-08-13 → 2026-06-06) |
| top committer share, last 100 commits | 56% (ark), 74% (zag) | 95%                             |

Both projects are effectively one maintainer. Radix's ecosystem is ~68× larger by downloads; Ark's
cadence is steady where Radix's was dormant for ten months and then burst.

## Appendix B — out of scope here

- **Touch drag in the Tree.** `@atlaskit/pragmatic-drag-and-drop`'s element adapter is native HTML5
  DnD (`draggable`/`dragstart`), which does not fire from touch in iPhone WKWebView. Tree reordering
  is desktop-only under Tauri mobile regardless of Radix or Ark. Tracked separately.
- `react-ui-list`'s `Combobox`/`Listbox` and the navtree — covered by the `ark` project.
