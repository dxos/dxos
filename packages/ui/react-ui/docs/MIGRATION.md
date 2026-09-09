# → Ark UI migration (plan)

**Status:** done for `react-ui` (2026-09-05). Phase 0 landed as #12902; Phases 1–4 and 6 are on
#12961, together with the consolidation that followed (`react-qr-rounded` → `QrCode`, `react-ui-tabs`
folded in, the inert `Menu` with `react-ui-menu`'s `ActionToolbar` / `ActionMenu` builders — see
`.agents/projects/ark/DESIGN.md`). Phase 5 (the RAC date/time cluster) is the one open decision; the
ledger in `.agents/projects/ark/TASKS.md` holds it and the follow-ups. §5 measures the net effect.
Every number below was measured against this tree at `@ark-ui/react@5.39.1` / `@zag-js/*@1.43.3` and
the `@-ui/*` versions in the lockfile on 2026-09-02 — re-measure before trusting a figure in a later
quarter.

This document considers moving `@dxos/react-ui` — and the `@dxos/react-ui-*` packages that share
its scaffolding — from Primitives to Ark UI. It inventories what each component is built on,
maps 's primitives onto Ark's and names the gaps, lists the modules other packages depend
on, and lays out a phased plan whose early phases are worth doing whether or not the later ones ever
happen.

The premise: the [Tree rebuild](../../react-ui-list/docs/TREE.md) (#12873, #12890) put Ark in the
app because has no tree. Once the Zag runtime is paid for, every further component we hand-build
that Ark ships is a recurring tax — and the [component inventory](#1-component-inventory) shows that
tax is larger than the -backed surface it would replace.

## Summary

- **Both libraries are headless, ship no CSS, and take `className` on every part.** `tx()` and the
  `*.theme.ts` files carry over unchanged. Styling is not a cost of this migration.
- **Most of the dependency is scaffolding, not behaviour.** Of ~230 `@-ui` imports under
  `packages/ui`, ~207 are `react-context`, `react-primitive`, `react-slot`, `react-compose-refs` and
  `react-use-controllable-state`. Those have nothing to do with Ark and can be owned in-repo in one
  small module — which is what unblocks removing `@-ui/*` from the 28 sibling packages.
- **Only 12 of `react-ui`'s 42 components wrap a behavioural primitive.** Three of them —
  `Popover`, `Tooltip`, `Menu` — are not wrappers but _forks_: they compose `react-popper`,
  `react-dismissable-layer`, `react-focus-scope`, `react-presence` and `react-portal` directly and
  re-implement 's own content layer (700–940 LOC each). Those are the expensive ones, and they
  are also where Ark's machines would delete the most code.
- **Ark's anatomy exposes what hides and hides what exposes.** buries the
  floating-ui positioner inside `Content` and exposes `Select.Viewport`; Ark exposes `Positioner` and
  has no viewport. Every floating component gains one node in the JSX and loses the `---*`
  variables in favour of one generic Zag set.
- **The blast radius is bounded by the namespace API.** 1,136 files import `@dxos/react-ui`, but the
  `Foo.Root / Foo.Trigger / Foo.Content` surface is ours; where Ark's anatomy matches we change
  nothing downstream, and where it differs the consumers are counted per component below.
- **`Select` is the one component whose API leaks.** Ark's `Select` takes a required
  `collection: ListCollection<T>` prop instead of JSX children — 44 consumer files change shape.
- **`Calendar` and `DatePicker` are a separate decision.** They are built on `react-aria-components`,
  not by hand, and RAC is load-bearing in `Input`'s date/time fields and `react-ui-form`'s
  `DateField`. Consolidating a second headless library is a real choice, not a port.

## 1. Component inventory

Every directory under [`src/components/`](../src/components). _LOC_ excludes stories and tests.
_Built on_ names the behavioural dependency; "scaffolding" means only `react-context`,
`react-primitive`, `react-slot`, `react-compose-refs` or `react-use-controllable-state`, which are
not what a migration replaces.

| component       |  LOC | built on                                                                                     | Ark component                                                      | consumers¹ | verdict                                                                                                                                                                                             |
| --------------- | ---: | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ---------: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AttentionGlyph  |  111 | scaffolding                                                                                  | —                                                                  |            | keep                                                                                                                                                                                                |
| Avatars         |  217 | scaffolding (hand-built)                                                                     | `avatar`                                                           |            | kept — the lit element owns the image fallback                                                                                                                                                      |
| Banner          |  267 | scaffolding                                                                                  | —                                                                  |            | keep                                                                                                                                                                                                |
| Breadcrumb      |  143 | scaffolding                                                                                  | —                                                                  |            | keep                                                                                                                                                                                                |
| Button          |  810 | `react-toggle`, `react-toggle-group`                                                         | `toggle`, `toggle-group`                                           |            | done (Phase 2)                                                                                                                                                                                      |
| Calendar        |  286 | `react-aria-components`                                                                      | `date-picker` (view)                                               |         21 | **decision** — see §4                                                                                                                                                                               |
| Card            |  772 | scaffolding                                                                                  | —                                                                  |            | keep                                                                                                                                                                                                |
| Carousel        |  528 | hand-built (+ `@dxos/react-focus`)                                                           | `carousel`                                                         |          4 | done (#12902)                                                                                                                                                                                       |
| Clipboard       |  124 | hand-built                                                                                   | `clipboard`                                                        |            | kept — a ten-line context                                                                                                                                                                           |
| Column          |  357 | scaffolding                                                                                  | —                                                                  |            | keep                                                                                                                                                                                                |
| DatePicker      |  332 | `Calendar` + `Popover`                                                                       | `date-picker`                                                      |          1 | **decision** — see §4                                                                                                                                                                               |
| Deferred        |  118 | none                                                                                         | —                                                                  |            | keep                                                                                                                                                                                                |
| Dialog          |  590 | `react-dialog`, `react-alert-dialog`                                                         | `dialog` (`role="alertdialog"` variant)                            |            | done (Phase 4a)                                                                                                                                                                                     |
| Editable        |  427 | hand-built                                                                                   | `editable`                                                         |         13 | done (#12902)                                                                                                                                                                                       |
| ErrorFallback   |  256 | `react-error-boundary`                                                                       | —                                                                  |            | keep                                                                                                                                                                                                |
| Focus           |  255 | scaffolding                                                                                  | `focus-trap` (partial)                                             |            | keep — `@dxos/react-focus` owns this                                                                                                                                                                |
| Icon            |  128 | scaffolding                                                                                  | —                                                                  |            | keep                                                                                                                                                                                                |
| Image           |  257 | none                                                                                         | —                                                                  |            | keep                                                                                                                                                                                                |
| Input           | 1247 | `react-checkbox` + RAC segmented fields                                                      | `checkbox`, `field`, `number-input`, `password-input`, `pin-input` |            | checkbox done (Phase 2); field done 2026-09-05 — `Root`/`Label`/`Description`/`Validation`/`TextInput`/`TextArea` on `field`, `@dxos/react-input` removed; date/time fields follow the RAC decision |
| Link            |   53 | scaffolding                                                                                  | —                                                                  |            | keep                                                                                                                                                                                                |
| Main            |  615 | `react-dialog` (sidebars)                                                                    | `dialog` / `drawer`                                                |            | done with Dialog (Phase 4a); on `drawer` since Phase 7 step 1                                                                                                                                       |
| MediaPlayer     |  196 | none                                                                                         | —                                                                  |            | keep                                                                                                                                                                                                |
| Menu            |  896 | **fork** of `react-menu`, `dropdown-menu`, `context-menu`                                    | `menu` (one machine; `contextTrigger` part)                        |        29² | done (Phase 3); graph rendering moved to `react-ui-menu`'s builders                                                                                                                                 |
| MenuButton      |  109 | `Menu`                                                                                       | —                                                                  |            | done with Menu                                                                                                                                                                                      |
| Panel           |  179 | scaffolding                                                                                  | —                                                                  |            | keep                                                                                                                                                                                                |
| Popover         |  701 | **fork**: `popper`, `dismissable-layer`, `focus-scope`, `focus-guards`, `presence`, `portal` | `popover`                                                          |         38 | done (Phase 3)                                                                                                                                                                                      |
| Progress        |   99 | hand-built                                                                                   | `progress`                                                         |            | kept — countdown semantics the machine lacks                                                                                                                                                        |
| ScrollArea      |  529 | scaffolding (hand-built)                                                                     | `scroll-area`                                                      |            | kept — hand-built thumbs; `Slottable` restructured instead                                                                                                                                          |
| ScrollContainer |  362 | scaffolding                                                                                  | —                                                                  |            | keep                                                                                                                                                                                                |
| Select          |  303 | `react-select`                                                                               | `select`                                                           |         44 | done (Phase 4a); the collection is registry-driven, so consumers kept JSX options                                                                                                                   |
| Separator       |   57 | `react-separator`                                                                            | —                                                                  |            | done (hand-rolled)                                                                                                                                                                                  |
| Show            |  104 | none                                                                                         | —                                                                  |            | keep                                                                                                                                                                                                |
| Skeleton        |   53 | none                                                                                         | —                                                                  |            | keep                                                                                                                                                                                                |
| Slider          |  107 | `react-slider`                                                                               | `slider`                                                           |            | done (Phase 2)                                                                                                                                                                                      |
| Splitter        |  434 | scaffolding (hand-built)                                                                     | `splitter`                                                         |          8 | done (#12902)                                                                                                                                                                                       |
| Stepper         |  330 | none (hand-built)                                                                            | `steps`                                                            |          3 | done (#12902)                                                                                                                                                                                       |
| Tag             |   52 | scaffolding                                                                                  | —                                                                  |            | keep                                                                                                                                                                                                |
| TextCrawl       |  312 | none                                                                                         | — (`marquee` differs)                                              |            | keep                                                                                                                                                                                                |
| Toast           |  229 | `react-toast`                                                                                | `toast` (toaster-store model)                                      |            | done (Phase 4b)                                                                                                                                                                                     |
| Toolbar         |  447 | `react-toolbar`, `react-toggle-group`                                                        | `toggle-group` only — **no toolbar**                               |            | done — `@dxos/react-focus` group + Ark `toggle-group`                                                                                                                                               |
| Tooltip         |  942 | **fork**: `tooltip`, `popper`, `dismissable-layer`, `presence`, `portal`, `visually-hidden`  | `tooltip`                                                          |         35 | done (Phase 3)                                                                                                                                                                                      |
| Tabs            |    — | was `react-ui-tabs` on `react-tabs`                                                          | `tabs`                                                             |         14 | done — folded into `react-ui`; attention lifted to `selectedVariant`                                                                                                                                |
| QrCode          |    — | was `react-qr-rounded`                                                                       | `qr-code`                                                          |          3 | done                                                                                                                                                                                                |

¹ Consumer files outside the component's own directory, `dist`/`out` excluded; blank where not
measured. ² Counted as `DropdownMenu.` references.

Ark components with no counterpart in `react-ui`, for reference:

| Ark component     | in the repo today                                    | note                                          |
| ----------------- | ---------------------------------------------------- | --------------------------------------------- |
| `accordion`       | `react-ui-list` — already on Ark                     | migrated on merit (APG keymap), see `TREE.md` |
| `collapsible`     | `react-list` — on Ark                                | done, Phase 2                                 |
| `tabs`            | `react-ui` `Tabs` — on Ark                           | done; folded in from `react-ui-tabs`          |
| `combobox`        | hand-built in `react-ui-list`                        | candidate, not obligation (+87.9 KB raw)      |
| `listbox`         | hand-built in `react-ui-list`                        | candidate, not obligation (+22.5 KB raw)      |
| `drawer`          | `react-ui` `Drawer` — on Ark                         | done 2026-09-09 (Phase 7); `Main` step 1 done |
| `tree-view`       | `react-ui-list` `Tree` — already on Ark              | the reason Ark is in the app                  |
| `hover-card`      | none                                                 |                                               |
| `navigation-menu` | none                                                 |                                               |
| `floating-panel`  | `FloatingPanel` (2026-09-05); the debug panel is one |                                               |
| `fieldset`        | `Fieldset` (2026-09-05); `Form.Section` is one       |                                               |
| `tour`            | none                                                 |                                               |
| `tags-input`      | none                                                 |                                               |
| `file-upload`     | none                                                 |                                               |
| `number-input`    | none (`Input` has no numeric variant)                |                                               |
| `pin-input`       | `Input.PinInput` hand-built                          |                                               |
| `password-input`  | none                                                 |                                               |
| `switch`          | `Input.Switch` hand-built                            |                                               |
| `rating-group`    | none                                                 |                                               |
| `segment-group`   | none                                                 |                                               |
| `pagination`      | none                                                 |                                               |
| `color-picker`    | none                                                 |                                               |
| `signature-pad`   | none                                                 |                                               |
| `qr-code`         | `react-ui` `QrCode` — on Ark                         | done; replaced `react-qr-rounded`             |
| `timer`           | none                                                 |                                               |
| `marquee`         | none (`TextCrawl` is a different thing)              |                                               |
| `image-cropper`   | none                                                 |                                               |
| `json-tree-view`  | none (devtools has its own `ObjectsTree` on `Tree`)  |                                               |
| `toc`             | `react-ui` `Toc` — on Ark                            | done 2026-09-09 (Phase 7); consumer open      |
| `angle-slider`    | none                                                 |                                               |
| `cascade-select`  | none                                                 |                                               |

## 2. Primitive mapping: → Ark

### 2.1 Scaffolding

|                                           |                                                                       uses³ | Ark                                                       | gap                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ----------------------------------------- | --------------------------------------------------------------------------: | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `@-ui/react-context` `createContextScope` | 85 imports; 19 `createContextScope` calls in 10 files; 116 `__scope*` props | `createContext` from `@ark-ui/react/utils`                | **No scope concept.** Ark's answer to "which Popover does this Trigger belong to" is the machine: `Foo.RootProvider value={useFoo(...)}` plus `useFooContext()`. The `__scopeDropdownMenu` (42), `__scopeTooltip` (31), `__scopePopover` (28) and `__scopeSyntax` (12) props exist only because our forks re-implement 's internal scoping; they disappear with the forks. The `composite-components` skill's pattern needs updating either way.       |
| `@-ui/react-primitive` `Primitive.div` …  |                              270 uses (`div` 53, `span` 16, `button` 13, …) | `ark.div` … from `@ark-ui/react/factory`                  | Drop-in. Both accept `asChild`; `ark.*` also takes `asChild` on every anatomy part.                                                                                                                                                                                                                                                                                                                                                                    |
| `@-ui/react-slot` `Slot`, `asChild`       |                                             33 imports; 422 `asChild` sites | `asChild` on `ark.*` and every part                       | Same merge order and same className/style/handler rules, two differences — no `Slottable`, and an explicit `undefined` on the child no longer clears a slot prop. §2.6 has the full comparison and where our `slottable()`/`composable()` layer absorbs it.                                                                                                                                                                                            |
| `@-ui/react-compose-refs`                 |                                             17 imports (+ ~12 packages, §3) | **not public** — Ark's `composeRefs` is internal          | Own it. Ten lines, and React 19's ref-cleanup semantics are worth controlling ourselves.                                                                                                                                                                                                                                                                                                                                                               |
| `@-ui/react-use-controllable-state`       |                                             20 imports (+ ~14 packages, §3) | **not public** — Ark's `useControllableState` is internal | Own it. Same shape; ~30 lines.                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `@-ui/react-id` `useId`                   |                                                                           3 | `React.useId`                                             | Drop-in.                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `@-ui/react-visually-hidden`              |                                                               1 (+1 plugin) | `sr-only` class                                           | Drop-in.                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `@-ui/primitive` `composeEventHandlers`   |                                                                           3 | `mergeProps` from `@ark-ui/react/utils`                   | Not a drop-in. `composeEventHandlers` runs the caller's handler first and skips its own when `event.defaultPrevented` is set (unless `checkForDefaultPrevented: false`); Zag's `mergeProps` merges prop objects and always invokes both handlers — it never reads `defaultPrevented`. Keep a ten-line `composeEventHandlers` in the Phase 1 scaffolding module for the three sites that rely on the skip; `mergeProps` is for merging whole prop bags. |

³ Counted under `packages/ui`, `dist` excluded.

**What Ark actually exports as utilities** is small: `createContext`, `ariaAttr`, `dataAttr`,
`mergeProps` (`./utils`); the `ark` factory (`./factory`); `Presence`, `Portal`, `FocusTrap`,
`ClientOnly`, `Format`, `Frame`, `Highlight`, `Swap`, `DownloadTrigger` as components; and the
`environment`, `locale`, `hotkeys` and `interaction` providers. Everything else Zag has — dismissable
layers, interact-outside, focus trapping, scroll locking, `aria-hidden` management — lives inside
`@zag-js/*` packages that are dependencies of Ark but not re-exported from it.

The consequence: **the scaffolding layer should be ours, not Ark's.** A single internal module
(`compose-refs`, `use-controllable-state`, a context helper) removes the five scaffolding
packages from every `@dxos/react-ui-*` package and 19 plugin files, costs nothing in bundle, and is
independent of whether any behavioural component ever moves. It is Phase 1 for that reason.

### 2.2 Structural parts

|                                                                              | Ark                                                                                                                         | difference                                                                                                                                                                                                                                                                                                                                                                                |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Positioner** — internal to `Content` (`react-popper` wraps it)             | `Foo.Positioner` — a required, named part _around_ `Content`                                                                | Every floating component gains one JSX node. The floating-ui math, `--x`/`--y`, side/align data attributes and collision flipping live on it. Ours: [`Popover.tsx`](../src/components/Popover/Popover.tsx) and [`Tooltip.tsx`](../src/components/Tooltip/Tooltip.tsx) already render `PopperPrimitive.Content` themselves, so the node already exists in our forks — it just isn't named. |
| **Viewport** — `Select.Viewport` (scroll clip; sets `overflow: auto` inline) | none — `Select.List`                                                                                                        | Ark declares no overflow; our theme must (`overflow-y-auto` on `List` or `Content`). Note `Popover.Viewport` and `Tooltip.Viewport` are **ours**, not 's — has no such part there. They exist so the arrow can straddle `Content`'s edge without being clipped ([`Popover.theme.ts:15`](../src/components/Popover/Popover.theme.ts)). They survive a port untouched.                      |
| `Dialog.Overlay`                                                             | `Dialog.Backdrop`                                                                                                           | rename                                                                                                                                                                                                                                                                                                                                                                                    |
| `Dialog.Close` / `Popover.Close`                                             | `Dialog.CloseTrigger` / `Popover.CloseTrigger`                                                                              | rename                                                                                                                                                                                                                                                                                                                                                                                    |
| `Select.Value`, `Select.Icon`                                                | `Select.ValueText`, `Select.Indicator`; new `Select.Control` wrapper                                                        | rename + one node                                                                                                                                                                                                                                                                                                                                                                         |
| `Select.ScrollUpButton` / `ScrollDownButton`                                 | none                                                                                                                        | Zag relies on native scroll. Delete or hand-roll (8 consumer files use them).                                                                                                                                                                                                                                                                                                             |
| `Select.Arrow`                                                               | none in `select` anatomy                                                                                                    | Delete.                                                                                                                                                                                                                                                                                                                                                                                   |
| `Arrow` (an `<svg>`, styled `fill-separator`)                                | `Arrow` > `ArrowTip` (two `<div>`s, styled via `--arrow-background`, `--arrow-size`)                                        | Not a rename — a theme change per floating component.                                                                                                                                                                                                                                                                                                                                     |
| `Presence` (mount/unmount animation)                                         | `Presence` component, `lazyMount` / `unmountOnExit` props on every `Root`                                                   | Equivalent; Ark's is also the source of `data-state` + the `[data-animate]` hook the Tree uses for disclosure.                                                                                                                                                                                                                                                                            |
| `Portal`                                                                     | `Portal` (`@ark-ui/react/portal`)                                                                                           | Equivalent.                                                                                                                                                                                                                                                                                                                                                                               |
| `DismissableLayer`, `FocusScope`, `FocusGuards`                              | inside the machine — `onInteractOutside`, `onPointerDownOutside`, `onFocusOutside`, `onEscapeKeyDown`; `trapFocus`, `modal` | Not composable primitives. A -style fork that stacks its own layers is not possible on Ark; you configure the machine. This is exactly the code the `Popover`/`Tooltip`/`Menu` forks would delete.                                                                                                                                                                                        |
| `Toolbar` (roving tabindex)                                                  | none                                                                                                                        | `@dxos/react-focus` (#12884) already owns focus groups; Toolbar becomes a `toggle-group` inside a focus group.                                                                                                                                                                                                                                                                            |
| `AlertDialog`                                                                | `Dialog` with `role="alertdialog"`                                                                                          | One prop.                                                                                                                                                                                                                                                                                                                                                                                 |
| Menu family: `Menu` + `DropdownMenu` + `ContextMenu` (three packages)        | `Menu` (one machine): `Trigger` for dropdown, `ContextTrigger` for context, `TriggerItem` for submenus                      | Collapses three of our imports into one.                                                                                                                                                                                                                                                                                                                                                  |

### 2.3 CSS variables

namespaces per component; Zag sets one generic set on the positioner.
95 occurrences across 12 source files today, of which 20 are the aliasing blocks in
[`Tooltip.tsx:577`](../src/components/Tooltip/Tooltip.tsx),
[`Popover.tsx:489`](../src/components/Popover/Popover.tsx) and
[`Menu.tsx`](../src/components/Menu/Menu.tsx) that re-map `---popper-*` onto
per-component names — those delete entirely.

|                                                                                     | Zag                                              |
| ----------------------------------------------------------------------------------- | ------------------------------------------------ |
| `---popper-anchor-width`, `---{select,popover,tooltip,dropdown-menu}-trigger-width` | `--reference-width`                              |
| `---popper-anchor-height`, `…-trigger-height`                                       | `--reference-height`                             |
| `---popper-available-height`, `…-content-available-height`                          | `--available-height`                             |
| `---popper-available-width`, `…-content-available-width`                            | `--available-width`                              |
| `---popper-transform-origin`, `…-content-transform-origin`                          | `--transform-origin`                             |
| `---accordion-content-height`                                                       | collapsible `--height`                           |
| `---toast-swipe-end-x`, `---toast-swipe-move-x`                                     | **none** — Zag's toast has its own gesture model |

External to `react-ui`: [`ui-theme/src/css/layout/size.css:53`](../../ui-theme/src/css/layout/size.css)
and [`ui-theme/src/css/theme/animation.css:110`](../../ui-theme/src/css/theme/animation.css).

### 2.4 State attributes

Both stamp state on the DOM as `data-*`, so variants are selectors in either library. Zag's are
richer: tree-view emits `data-branch data-checked data-depth data-disabled data-focus data-loading
data-path data-renaming data-selected data-state data-value`; select adds `data-highlighted
data-placement data-side data-placeholder-shown`. Only 11 `data-[…]` Tailwind selectors exist across
`ui-theme` + `react-ui` today, none of them state names, so nothing here breaks.

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
- **The shared runtime is already paid for — in the bundle, not in the boot graph.** The Tree bought
  the ~24.5 KB raw Zag core; marginal cost per further component is single-digit KB gzip (`Tabs` 12.7
  → `Tabs`+`TreeView` 25.6 KB gzip, i.e. `TreeView` marginal 12.9 KB). Do not re-argue wider adoption
  as a bundle saving; it is not one, and it is not a cost either.
- **But the boot graph pays again for each package that is boot-reachable.** The Tree's core sits in
  `react-ui-list`, which plugins load lazily — its landed eager cost was 1,652 bytes (Appendix A).
  `react-ui` is in the entry closure, so Phase 0 pulled the core _and_ its four machines into it:
  **+95.8 KB against 0.11 MB of remaining headroom** on a 4.35 MB budget. Every later phase that puts
  a machine into `react-ui` spends from that, and the budget will need re-baselining before Phase 3
  regardless of the net figure. Read `check-boot-budget.mjs` before assuming a swap is free.
- **Touch.** Zag handles `pointerType`/touch in 17 machines; in 6 packages. Under Tauri mobile
  (WKWebView) that matters, and `drawer` was the component that had no answer at all (it has one since Phase 7).

### 2.6 Slots and `asChild`

Both libraries answer the same question — "render my behaviour onto the element you give me instead
of the one I would create" — with an `asChild` prop that clones the single child and merges the
part's props into it. The mechanics differ in three places that matter to us, and our own
`slottable()`/`composable()` layer is where they get absorbed.

**What each does**, read from the installed sources
(`@-ui/react-slot@1.0.1` `Slot.tsx`; `@ark-ui/react@5.39.1` `factory.ts` over
`@zag-js/core` `merge-props`):

| concern         | `Slot`                                                                          | Ark `ark.*` / every part (`asChild`)                                                                         |
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
`Tooltip` 14 — and only 11 directly on a primitive (`ToolbarPrimitive` 8,
`ToggleGroupPrimitive` 3). Those namespaces are built with two factories in
[`react-ui/src/util/slots.ts`](../src/util/slots.ts): `slottable()` (20 files) for parts that accept
`asChild`, `composable()` (51 files) for leaves, over `SlottableProps`/`ComposableProps` from
`@dxos/ui-types`. `composableProps()` reconciles the `className` a slot merge injects with our
`classNames` prop, and a dev-only `COMPOSABLE` marker paints `dx-slot-warning` on an `asChild`
child that is not composable — the case where a slot's props are silently dropped. 's
`Slottable` is used twice: `Tooltip` and `ScrollArea` (thumbs rendered beside the slotted child).

**What the migration changes.**

- **The factories move, the call sites don't.** `slottable()`'s `asChild ? Slot : Primitive.div`
  becomes `ark.div` (which takes `asChild` itself), and `composable()` renders `ark.<tag>`. That is
  the whole swap for the 422 sites; it lands in Phase 1 with the rest of the scaffolding, and it is
  what lets `@-ui/react-slot` and `react-primitive` leave every sibling package.
- **`Slottable` has no Ark equivalent.** `Tooltip` and `ScrollArea` restructure so the sibling
  content is rendered by the part rather than passed through the slot — or keep a 40-line local
  `Slot`+`Slottable` ('s is that small). Decide per component in its own phase (Tooltip in 3,
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
  it, exactly as with ; nothing to do, but not a performance win to advertise.
- **`data-part` on consumer elements** is new: under `asChild` the consumer's element becomes the
  part for CSS purposes. Harmless with `tx()` (className-driven), and it is what would make a
  stylesheet-level skin possible later.

The dev diagnostic, `composableProps()` and the `SlottableProps`/`ComposableProps` types are ours
and survive unchanged; the `composite-components` skill's example (`asChild ? Slot : Primitive.div`)
is the only documentation that needs its line rewritten.

### 2.7 Theming

The migration does not touch the theme layer, and that is worth stating rather than assuming: Ark
ships no CSS at all, and every part takes `className`, so a `*.theme.ts` is portable across the swap
by construction. What _does_ move is where a variant reads its state from.

#### What we do today

Three layers, in resolution order:

1. **A `*.theme.ts` per component** — 31 files, 1,678 lines in `react-ui`. Each exports
   `ComponentFunction<StyleProps>`s ([`ui-types/src/theme.ts:8`](../../ui-types/src/theme.ts)): style
   props in, a className string out, composed with `mx()` — tailwind-merge under a repo config
   ([`ui-theme/src/util/mx.ts`](../../ui-theme/src/util/mx.ts)) — so the last writer of a conflicting
   utility wins predictably.
2. **A path tree** registered in [`defaultTheme.ts`](../src/theme/defaultTheme.ts) and resolved at
   render through `tx('editable.preview', styleProps, classNames)` off `useThemeContext()`. `tx` is a
   `ThemeFunction`, not a lookup: it is the indirection point where density, elevation and theme mode
   would enter, and where a consumer's `classNames` is merged last.
3. **A CSS layer** — 138 `.dx-*` classes across 14 files in
   [`ui-theme/src/css/components`](../../ui-theme/src/css/components) — for what a utility string
   cannot say once: surfaces, focus rings, input chrome.

#### What Phase 0 changed

Almost nothing, and the diff is the evidence: across the four components the theme files moved
**+45 / −15 lines** against 1,678, and 32 of the 45 additions are a new `Stepper` part and its error
palette, not the port. `Carousel` has no theme file at all and did not gain one.

The one real change is a rule worth carrying into later phases:

> **State the machine owns is read off the attribute it stamps; state we compute stays a style prop.**

`Editable` is the worked example. `disabled` and `placeholder` left `EditableStyleProps` and became
`data-[disabled]:` / `data-[placeholder-shown]:` selectors, because the machine is the authority on
both and threading them back through React only creates a second source of truth. `Stepper`'s
`failed` stayed a prop, because a run failing is ours to know and the machine has no notion of it.

Two gotchas found doing it:

- **Attribute variants outrank plain ones by specificity, not source order.** `data-[disabled]:` beats
  `hover:` wherever they collide, so an override has to be written attribute-qualified —
  `data-[disabled]:hover:bg-transparent`, not a later plain `hover:`. tailwind-merge will not resolve
  this for you: the two are different variants and it keeps both.
- **`hidden` needs `!important` to survive a `display` utility.** Ark hides the inactive part with the
  `hidden` attribute rather than unmounting it; Tailwind v4's preflight declares
  `[hidden]{display:none!important}`, which is what keeps a `flex` class from overriding it. Worth
  knowing before anyone trims preflight.

The `data-[…]` count across `react-ui` + `ui-theme` is now 41, up from the 11 recorded in §2.4 — Zag
state names are the whole of the increase.

#### The Ark-native alternative, and why we are not taking it

Every Ark part carries `data-scope="<component>" data-part="<part>"`, and `createAnatomy(...).build()`
returns a ready-made selector per part. That is a genuinely different model: skin from a stylesheet,
address parts by attribute, thread no classNames at all. It is how Park UI and Panda dress Ark, and
under `asChild` it reaches the consumer's own element too (§2.6).

It is the more natural fit for Ark, and it is still the wrong trade here:

- **`tx()` is not a class lookup.** It is the one place a style decision can consult more than the
  DOM — style props, and the density/elevation/mode context that a `ThemeFunction` exists to carry. A
  stylesheet selector sees only what the machine stamped, so every variant we compute would need an
  attribute invented for it to hang on.
- **Per-instance overrides regress.** `classNames` is merged last by tailwind-merge, which resolves
  conflicts by knowing the utilities. Stylesheet rules resolve by specificity, so a consumer override
  goes back to guessing at selector weight.
- **It would be a second system, not a replacement.** The 14 non-Ark components and the whole `.dx-*`
  layer are not moving, so adopting it buys one more way to style things rather than one fewer.

**Where it is worth revisiting: parts we never render.** A `Positioner`, or portal-mounted content
Ark builds itself, has no element of ours to take a `className` — there the attribute selector is the
only handle. That lands in Phase 3 (floating), and is the one place this decision should be reopened
rather than assumed.

## 3. modules used outside `react-ui`

`grep -rho "@-ui/[a-z-]*" <pkg>/src`, stories excluded. Every entry is scaffolding except the
three marked **behavioural**.

| package                                                                                                                | `react-context` | `use-controllable-state` | `compose-refs` | `slot` | `primitive` | behavioural                                                                         |
| ---------------------------------------------------------------------------------------------------------------------- | --------------: | -----------------------: | -------------: | -----: | ----------: | ----------------------------------------------------------------------------------- |
| react-ui-mosaic                                                                                                        |               4 |                        1 |              5 |      3 |           3 |                                                                                     |
| react-ui-list                                                                                                          |               7 |                        1 |                |      1 |             |                                                                                     |
| react-primitives/react-list                                                                                            |               2 |                        1 |                |      1 |           3 | **`collapsible` (2), `checkbox` (1)**                                               |
| react-primitives/react-input                                                                                           |               1 |                          |                |      1 |           2 | removed 2026-09-05: `Input` is on Ark's `field`                                     |
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

- **Scaffolding (every row).** 28 `react-ui-*` packages and 28 plugin/app/sdk files depend on
  for `createContext`, `composeRefs`, `useControllableState`, `Slot` and `Primitive`. None of that is
  behaviour, and Ark publicly exports only `createContext` and the `ark` factory. The fix is an
  in-repo module, not Ark; see Phase 1. Until it exists, `@-ui/*` cannot leave the catalog no
  matter how many components move.
- **`react-list` — `collapsible` + `checkbox`.** Ark has both machines. `Collapsible` is a leaf swap;
  `Checkbox` shares its migration with `Input`. `react-list` is the lowest tier (`react-primitives`),
  so it moves in Phase 2 with the other leaves.
- **`react-ui-tabs` — `tabs`** (folded into `react-ui` as `Tabs` on 2026-09-05; the package is gone). Ark `Tabs` anatomy (`Root/List/Trigger/Content/Indicator`) is a
  near-match for 's; the only addition is the optional `Indicator`. Leaf swap.
- **Plugin-level behavioural imports** (`plugin-*` reaching for `@-ui/react-tooltip`, `-toolbar`,
  `-toggle-group`, `-toggle`, `-toast` directly) are pre-existing layering violations — a plugin
  should consume `@dxos/react-ui`'s namespace, not 's. They are fixed by re-pointing at
  `@dxos/react-ui` regardless of the migration, and should be, in Phase 1.
- **`react-ui-list`'s `Combobox` and `Listbox`** are hand-built on scaffolding and have Ark machines
  (`combobox` +87.9 KB raw, `listbox` +22.5 KB raw marginal — measured in the `ark` project). They are
  candidates, not obligations, and sit outside `react-ui`; listed for completeness.

## 4. Phased plan

Each phase is independently landable and leaves the tree consistent. Phases 1–2 are worth doing even
if 3–5 never happen. Verification gate for every phase: `moon run <pkg>:build`, `moon run :lint --
--fix`, the affected stories rendered with a clean console, and the consuming packages' tests.

### Phase 0 — hand-built components with Ark machines _(done, #12902, 2026-09-04)_

`Carousel`, `Editable`, `Splitter`, `Stepper` → `carousel`, `editable`, `splitter`, `steps`.
~2,264 LOC of hand-maintained interaction and a11y, no behavioural dependency, consumer counts
4 / 13 / 8 / 3. Adds `@ark-ui/react` to `react-ui`'s dependencies (catalog). Order: Stepper →
Editable → Splitter → Carousel (Carousel also imports `@dxos/react-focus`).

Deliverable: one PR, `react-ui: rebuild Carousel, Editable, Splitter and Stepper on Ark UI`.

### Phase 1 — own the scaffolding _(done, 2026-09-05)_

Create the replacements for the five scaffolding packages inside `react-primitives`
(`react-hooks` already holds `compose-refs`'s single use there):

- `composeRefs` — ten lines, React 19 cleanup-aware.
- `useControllableState` — same signature as 's.
- `createContext` — decide between Ark's (no scope) and a scoped variant. Recommendation: **no
  scope**. The 116 `__scope*` props exist only inside the `Popover`/`Tooltip`/`Menu` forks that Phase
  3 deletes, and `react-ui-syntax-highlighter`'s 12 can move to a plain context.
- `ark.*` for `Primitive.*` — 270 sites, mechanical. Requires `@ark-ui/react` as a dependency of
  every package that uses it; alternatively keep a local `Primitive` shim over `ark`. Recommendation:
  import `@ark-ui/react/factory` directly — it is one module.

Sweep the 28 `react-ui-*` packages and 28 plugin/app/sdk files. Re-point the plugin-level
behavioural imports at `@dxos/react-ui`. Update the `composite-components` skill.

Outcome: `@-ui/react-context`, `-primitive`, `-slot`, `-compose-refs`, `-use-controllable-state`
and `-id` leave every `package.json` except `react-ui`'s. Zero anatomy change, zero consumer change.

### Phase 2 — leaves: behavioural swaps with no anatomy leak _(done, 2026-09-05)_

Verdicts revised on inspection while doing it:

- **Progress, Avatars, Clipboard are not ported.** `Progress` is countdown / error-fill / rewind-snap
  semantics the `progress` machine has no notion of; `Avatar.Content` is the lit `DxAvatar` element,
  so Ark's image-fallback machine has nothing to own; `Clipboard` is a ten-line context and two
  buttons. Each would add a machine to the eager graph for no behaviour.
- **ScrollArea keeps its hand-built thumbs.** Ark's `scroll-area` needs a `Content` part _inside_ the
  viewport to measure, and 530 consumers style `ScrollArea.Viewport` as the direct parent of their
  children — a wrapper there is a layout break, not a port. What Phase 2 does to it is the `Slottable`
  restructure: `Root` owns its element and renders the thumbs beside the children (no consumer passed
  `asChild` to it); `Viewport` keeps `asChild`.
- **Toolbar is pulled forward from Phase 5.** `Toolbar.Root` is a `@dxos/react-focus` group (axis =
  orientation, memorised entry, cyclic) and any focusable child is an item; `Toolbar.ToggleGroup` is the
  Ark-backed `ToggleGroup` with `rovingFocus={false}`. The `Toolbar.*` namespace is unchanged.
- **`ToggleGroup` keeps the -shaped single/multiple API** over Ark's `value: string[]`.
- **`Input.Checkbox` is a native input behind a styled control.** Element props (test ids, handlers)
  reach the control, form props the input; the `Input.Root` id lands on the input so `Input.Label`
  still reaches it. The control toggles by clicking the input itself rather than through label
  activation, because a tree row's click handler calls `preventDefault()` and that cancels label
  activation in Chromium (happy-dom does not emulate it — the storybook run caught it).
- **`Input.Switch` and `Input.PinInput` stay hand-built** for now; `pin-input` is a later-phase
  candidate (deletes ~150 lines, three consumers).

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

### Phase 3 — floating: the forks _(done, 2026-09-05)_

The three forks — `Tooltip` (942 LOC), `Popover` (701), `Menu` (896) — are the heart of the
migration and the largest deletion. Each currently reimplements 's content layer from `popper`,
`dismissable-layer`, `focus-scope`, `presence` and `portal`; on Ark that logic is the machine, and the
component becomes anatomy + theme.

Order: **Tooltip → Popover → Menu**, so the positioner pattern, the `Arrow`/`ArrowTip` theme change
and the CSS-variable rename are settled on the smallest fork first.

- Add `Positioner`; keep our `Viewport` (it is ours, and its clipping rationale still holds).
- Rename the five `---*` variables per §2.3; delete the three aliasing blocks.
- `Arrow` → `Arrow` + `ArrowTip`, `fill-separator` → `--arrow-background`.
- `DropdownMenu` + `ContextMenu` collapse onto one `Menu` machine with `ContextTrigger`.
- `MenuButton` and `react-ui-menu` follow `Menu`.
- Retire `__scopeTooltip`/`__scopePopover`/`__scopeDropdownMenu` with the forks.

Consumer exposure: Tooltip 35 files, Popover 38, DropdownMenu 29 — but only sites rendering an
`Arrow` or reading a `---*` variable change; the namespace API holds otherwise.

Outcome: `react-popper`, `-dismissable-layer`, `-focus-scope`, `-focus-guards`, `-presence`,
`-portal`, `-tooltip`, `-menu`, `-dropdown-menu`, `-context-menu` leave `react-ui`. Also
`aria-hidden` and `react-remove-scroll`, which only the Popover fork imports.

**Done (2026-09-05).** Verdict revisions from the port:

- `Tooltip` kept its single-provider design (one machine, one content node, N triggers) rather than
  Ark's `Tooltip.Root` per trigger: Ark's `Tooltip.Trigger` subscribes every trigger to the machine,
  which would re-render all 47 consumers' triggers on every open. Our trigger is an `ark.button` that
  asks `api.getTriggerProps({ value })` at event time instead.
- Zag's positioner sets `z-index: var(--z-index)` inline, so a `z-*` class cannot win; the theme sets
  the variable (`surfaceZIndexVar` in `ui-theme`). `overflowPadding` is one number, so safe-area
  collision padding collapses to its widest side. Closed content needs `lazyMount unmountOnExit` or
  Ark keeps it mounted-hidden before the first open (a play story caught it).
- `Popover.Content`'s placement props are lifted to the root as state, because Ark positions from the
  root; `sticky` has no counterpart and was dropped (one consumer).
- `Menu` selection is handled on the item's own click, not through the machine's `onSelect`: Zag's
  `invokeOnSelect` reads `highlightedValue` from context, and a click landing before React commits the
  pointerdown's highlight (a `userEvent.click` right after open) selects nothing. `closeOnSelect` is
  off and the item closes the menu unless its cancelable `onSelect` was `preventDefault()`ed, which
  keeps 's contract. `DropdownMenu.Root modal` is accepted as a no-op.

### Phase 4 — modal, toast, select _(done, 2026-09-05)_

- **`Dialog` + `Main`** → `dialog`. `Overlay` → `Backdrop`, `Close` → `CloseTrigger`, `AlertDialog`
  → `role="alertdialog"`. `Main`'s sidebars are dialogs today; evaluate `drawer` for them —
  it is also the missing mobile bottom-sheet. Acceptance: a dialog rendered without
  `Dialog.Description` carries **no** `aria-describedby`. `Dialog.Content` forces
  `aria-describedby={undefined}` today to keep from pointing it at a missing id; Ark omits the
  attribute when the part is absent, so the contract holds by default — verify it in the story for
  the no-description case rather than assuming it.
- **`Toast`** → `toast`. Model change: Ark's is a `createToaster()` store with a `Toaster` host,
  not a provider-plus-`Toast.Root` tree. The `---toast-swipe-*` animation in
  `animation.css:164` has no equivalent and is replaced by Zag's gesture handling.
- **`Select`** → `select`. The one API leak: required `collection: ListCollection<T>`, plus
  `Control`, `ValueText`, `Indicator`, `Positioner`, `List`; `ScrollUpButton`/`ScrollDownButton`/
  `Arrow` deleted. 44 consumer files, 39 using `Viewport`, 8 using the scroll buttons. Decide up front
  whether `Select.Option` keeps a children-driven convenience layer that builds the collection from
  JSX, so most consumers change one import and nothing else. **Decided 2026-09-05: keep the children
  API in this pass; moving consumers to Ark's `collection` prop is a later phase of its own.**

**Done for Dialog, Main and Select, then Toast (2026-09-05).** Verdict revisions:

- `Dialog.Overlay` is Ark's `Backdrop` with the content nested inside it, not a sibling `Positioner`:
  every consumer nests `Content` in `Overlay`, and the backdrop's own presence runs the exit animation.
  `AlertDialog` is the same implementation with `role="alertdialog"` and outside clicks ignored.
- The no-description acceptance holds: Zag adds `aria-describedby` only when a `Description` element is
  in the DOM, pinned by a play story.
- Ark's `drawer` was evaluated for `Main`'s sidebars and not used, on the reading that it positions and
  animates its content itself and so fights the inset-driven slide in `main.css`. **That reading was
  wrong — see Phase 7.** The sidebars stay on the dialog machine with `hidden={false}` for now.
- `Select` keeps the children API by having each option register with the root, which builds the
  `collection`; the trigger shows the selected option's own children as 's `ItemText` did. The
  content therefore stays mounted (hidden) while closed. `Arrow` and the scroll buttons are gone.
- `Toast` keeps its declarative API over the store: the provider owns `createToaster` and a registry
  of declared roots, `Toast.Root` renders nothing in place and mirrors `open` into the store, and
  `Toast.Viewport` is Ark's `Toaster` rendering each root's content inside the machine's actor. The
  `--radix-toast-swipe-*` animation is gone with the `tailwindcss-radix` plugin; motion is the
  machine's inline variables transitioned in `toast.css`.

### Phase 5 — decisions, not ports

- **`Calendar` / `DatePicker` / RAC.** `react-aria-components` backs `Calendar`, `Input`'s
  `Date`/`Time`/`DateTime` segmented fields, `SegmentedInput`, `react-ui-form`'s `DateField`, and the
  `withTheme` decorator installs its `I18nProvider`. Ark's `date-picker` covers the calendar and
  input (`date-input`) but not RAC's segmented-field model one-for-one. Options: (a) keep RAC as a
  second headless library for the date/time cluster and stop there; (b) consolidate onto Ark and
  rebuild the segmented fields. Not decided; (a) is the default until someone needs (b).
- **`Toolbar`.** Decided in Phase 2: `Toolbar.Root` is a `@dxos/react-focus` group containing Ark
  `toggle-group`s and the `Toolbar.*` namespace survives. Graph-driven toolbars are
  `react-ui-menu`'s `ActionToolbar`, a whole `Toolbar.Root` built from `MenuActions`.
- **`Focus`.** Keep; it is the seam between `react-ui` and `@dxos/react-focus`, and Ark's
  `focus-trap` covers only the trapping half.

### Phase 6 — remove _(done, 2026-09-05)_

The 36 `@-ui/*` catalog entries are gone, with `aria-hidden`, `react-remove-scroll`,
`tailwindcss-radix` and `react-qr-rounded`; `pnpm knip` is clean. What remains of Radix in the
lockfile arrives through tldraw, excalidraw and leva.

### Phase 7 — `Drawer`, and `Main` on the drawer machine _(component done 2026-09-09; port step 1 done the same day)_

`Drawer` (`react-ui/src/components/Drawer`) wraps Ark's drawer: `Root` names the edge as a `side`
(`start`/`end`/`top`/`bottom`) and maps it to the machine's `swipeDirection`; `Overlay` is the backdrop
the content nests in, as with `Dialog`; `Content` renders the machine's `Positioner` around its
`Content`, and the theme keys every part on the `data-swipe-direction` the machine stamps (`down` is the
sheet at the bottom, `left` the panel on the left edge). Snap points are fractions of the **viewport**,
each capped by the content's own extent, so a short panel is fully open at every point; the
`BottomSheet` story carries filler to show one. `Grabber` renders the indicator itself; `SwipeArea` is
the strip along the edge a swipe opens it from. `drawer.css` runs the slide keyframes over the same
`transform` the machine drives during a drag, so the close slide starts from wherever a drag left the
panel. Play stories pin open/Escape/reopen and the no-description `aria-describedby` contract.

**Push mode (2026-09-09, rebuilt the same day).** `Root push` makes the panel part of the page's layout
instead of a layer over it, on Ark's own anatomy: the positioner is the clip — a flex item whose extent
is `--dx-drawer-size` scaled by `--dx-drawer-open`, a registered number that eases 0↔1 over 250ms
(the Splitter's collapse timing), so a size change lands at once while an open or close eases — and
the content is a fixed-size sheet at the clip's inner edge, so it slides in from beyond the page edge
as the clip opens and needs no anchoring of its children. The sheet stays mounted while closed,
`inert` and `aria-hidden`, so the clip can close over it. In a grid host the clip hangs from the page edge (`justify-self`). Two things the sheet must not do: carry the machine's transform (the machine sets its drag offset to the content's size on open and expects CSS to ease it to zero — its own enter slide, which ran against the clip's opening and left the sheet standing still; it is cancelled, so a pushed drag has no live feedback), and be scrollable (`overflow: clip`, not `hidden` — focusing the first tabbable on open scrolled a hidden-overflow clip to the sheet's far end, another way to stand still). The first
build made the content both clip and sheet and spent a day anchoring children inside a shrinking box
against a second animated box outside it; that shape is what to avoid. Found on the way: Zag's
dismissable layer stack takes every later-opened layer for a nested one and dismisses it when a lower
layer leaves, so closing one drawer closed its sibling — `Drawer.Root` vetoes the cross-layer
`request-dismiss` in `onRequestDismiss`; a fraction snap point is a fraction of the viewport capped by
the content's own extent; the Splitter set its `transition` from an effect, a commit after the sizes
landed, and its `minSize` snapped back with the mode and held a growing pane — both fixed in
`Splitter`; the Browser pane's document is `hidden`, which freezes CSS animations, so motion checks
belong in the vitest browser (`TestPushCollapse` samples per frame).

**`Main` re-probed (2026-09-09, `MainDrawerProbe.stories.tsx`, kept in history one commit).** The
navigation sidebar was mounted on `useDrawer` in place of `useDialog` below `lg`, with `main.css`
untouched, and a synthetic touch swipe was driven through the machine. Findings:

- The machine's only inline positioning is `transform: translate3d(var(--drawer-translate-x), …)` plus
  `transition-duration: 0s` while dragging. `main.css` slides on `inset-inline-start`, a different
  property, so the two coexist: mid-drag the panel followed the pointer (`--drawer-translate-x: -117px`
  at a third of its width, `data-dragging` set), and on release past `closeThreshold` the machine called
  `onOpenChange(false)`, the transform reset to 0 and the inset slide took the panel off screen. A short
  drag snapped back with the transform transitioned to 0. Nothing fought.
- `hidden={false}` overrides the machine's `hidden` exactly as with the dialog machine; `modal: false`,
  `trapFocus: false`, `preventScroll: false`, `restoreFocus: false` all exist. At `lg` the sidebar stays a
  plain landmark; the structure of `MainSidebar` does not change.
- `preventDragOnScroll` (default on) refuses a drag whose target can scroll along the swipe axis; the
  sidebar scrolls vertically only, so a horizontal swipe is allowed. The gate reads the pointer's
  _target element_, which is why a synthetic move dispatched on `document` never starts a drag.
- The port replaces `useSwipeToDismiss` (103 lines, one side only) with the machine, gives the
  complementary sidebar swipe-to-dismiss, and `Drawer.SwipeArea` adds edge-swipe-to-open on touch,
  which nothing provides today. `closeThreshold` becomes a fraction of the sidebar's width rather
  than 64px. Still unverified: a real touch device (WKWebView), the case that matters.

**`Main` port, step 1 (2026-09-09).** `MainSidebar` below `lg` is `useDrawer` in place of `useDialog`,
with the same non-modal settings (`modal`, `trapFocus`, `preventScroll`, `restoreFocus` all off) and
`swipeDirection` from the side; `hidden={false}` keeps the content mounted for `main.css`'s inset slide
exactly as before. The public API, the three-state model, the `lg` landmark branch, `main.css`'s
geometry and the deck's focus CSS are untouched — step 2 (push layout at `lg`, on `Drawer push`'s
clip-and-sheet) is a separate PR. What changed:

- `useSwipeToDismiss` (103 lines, navigation side only, driven off `inset-inline-start` and inline
  `transition-duration`) is deleted; the machine's content drag replaces it on both sidebars.
  `swipeToDismiss` is now on by default and maps to the content's `draggable`.
- `swipeToOpen` (on by default) renders the machine's `SwipeArea` beside the content while the drawer
  is closed: a touch swipe inward from the edge opens the sidebar through `onOpenChange(true)` →
  `'expanded'`. The strip is touch-only (`.dx-main-swipe-area`, `@media (pointer: coarse)`), since under
  a mouse a fixed edge strip takes the clicks aimed at whatever sits at the edge. There is no live
  preview of the opening swipe: the machine positions the content with its transform from
  off-screen, but `main.css` holds a closed sidebar at `-100vw`, so the panel slides in on release.
- The two sidebars are sibling layers in Zag's dismissable stack, which treats the later-opened one as
  nested and dismisses it when the other leaves; `onRequestDismiss` vetoes a request whose target layer
  does not contain the sidebar, as `Drawer.Root` does. `TestSwipeToDismiss` opens both on mount and
  checks the complementary sidebar survives the navigation sidebar's swipe.
- The machine is open only while the sidebar is `expanded`: below `lg` that is the one state on
  screen, and `collapsed` is the resting state there (the deck's default, where the overlay sends a
  sidebar). A dismissal therefore returns to `collapsed`, not `closed` (the dialog port went to
  `closed`, which at `lg` is the no-rail state), and the swipe area can open from `collapsed`.
  `onOpenChange` handles `open: true` (the swipe area's release), not only dismissal.
- `aria-label` is on the element rather than the machine, so the `lg` landmark carries it too.

`Main.stories.tsx` pins it in the vitest browser at an 800px viewport: swipe-to-dismiss on both sides
(mid-drag `data-dragging` and a non-zero `--drawer-translate-x`, `closed` on release), a short drag
snapping back, and a touch swipe from the swipe area opening the navigation sidebar. The deck and
navtree stories that mount `Main` pass unchanged. Still to do before this reaches users on iOS: the
WKWebView touch check, and the interaction with the OS back-swipe on the left edge.

### Phase 7b — `Toc` _(2026-09-09)_

`Toc` (`react-ui/src/components/Toc`) wraps Ark's toc machine part for part: `Root` owns the machine
(`items` as `{ value, depth }`, an optional `scrollEl`, controlled/uncontrolled `activeIds`,
`rootMargin`/`threshold` for the `IntersectionObserver`, `autoScroll`, `scrollBehavior`) and publishes
the indicator's rect as `--top`/`--height`; `Content` is the document (an `article`); `Nav` the
landmark, labelled by `Title`; `List` the positioned ancestor the machine measures item offsets
against; `Indicator` a bar spanning the active items; `Item` indents by `--depth`; `Link` is the
anchor, which with a `scrollEl` scrolls the heading into view and pushes the hash instead of letting
the browser jump. The machine resolves an item by `getElementById(value)`, so it fits rendered
documents whose headings carry ids — `MarkdownView` does not give its headings ids today, and the
CodeMirror editor renders no headings at all; the consumer is still to decide (`rehype-slug` on
`MarkdownView` is the obvious first). `Toc.stories.tsx` pins it in the vitest browser: scrolling the
container to a heading activates its link and moves the indicator onto the active items; clicking a
link scrolls the container so the heading lands at its top edge.

### Phase 7c — `Tour`, and the welcome tour off `react-joyride` _(2026-09-09)_

`Tour` (`react-ui/src/components/Tour`) wraps Ark's tour machine part for part: `useTour` creates the
machine from `steps` (`{ id, type, target, title, description, placement, arrow, backdrop, actions,
effect }`) and `Root` provides it, so the consumer keeps the api (`start`, `next`, `prev`, `setStep`,
`setSteps`); `Portal` places `Backdrop` (the scrim, with the target cut out by clip-path), `Spotlight`
(a ring the machine sizes over the target) and `Positioner` (beside the target for a `tooltip` step,
centred for a `dialog` step) against the document; `Content` is the alert dialog with `Arrow`,
`Title`, `Description`, `ProgressText`, `Close`, `Control` and the `Actions`/`ActionTrigger` render
prop over a step's actions. The machine waits up to three seconds for a target (mutation observer),
scrolls it into view, marks it `data-tour-highlighted` (which `tour.css` turns into
`--controls-opacity: 1`, so hover-revealed controls show), traps focus between card and target, and
walks steps on the arrow keys. The parts stack on `--tour-layer` over `--tour-z-index`, set by the
theme at the tooltip level. `Root` defaults to `lazyMount unmountOnExit`, so the card is in the DOM
only while a tour runs. `Tour.stories.tsx` walks a dialog step and three tooltip steps in the vitest
browser: placement side, highlight hand-off, progress text, arrow-key navigation, Escape.

`plugin-support`'s `WelcomeTour` is rebuilt on it, and `react-joyride`, `react-floater` and
`type-fest` (a TS2742 hack for the floater types) leave the repo. `Tour.Step` is now the plugin's own
type — `target` (selector or function), `title`, `description`, `placement`, and `before` — and the
composer's `help.ts` steps drop their joyride fields. `before` becomes the machine step's `effect`:
the step shows once the hook settles, and the target is resolved after it, so a hook that opens the
sidebar brings its target into being — the old `waitForTarget` mutation observer is the machine's.
The dialog pause is kept: while `layout.dialogOpen` the tour leaves through its close trigger (the
api exposes no dismiss) with the step remembered, and resumes there when the dialog closes; a target
that never appears ends the tour. The card keeps its test ids and `data-step` numbering (the step ids
are one-based positions, which the machine stamps as `data-step`), so `first-run.spec.ts` reads
unchanged. `WelcomeTour.stories.tsx` walks the steps by the card's own buttons.

## 5. Net effect

Measured on 2026-09-05 from d4b4919f87, the last `main` commit before the Tree rebuild (#12873,
1 Sep), to the head of #12961. The whole-repo diff over that window (1,913 files) is dominated by
unrelated work, so the code figures are scoped to `packages/ui` and the two packages the port
removed.

| Measure                                | 31 Aug baseline          | now                                                  |
| -------------------------------------- | ------------------------ | ---------------------------------------------------- |
| UI-scoped code                         |                          | 569 files, +16,318 / −9,528 (net +6.8k)              |
| Files importing `@radix-ui`            | 144                      | 0                                                    |
| Files importing `@ark-ui/react`        | 0                        | 67                                                   |
| Lockfile `@radix-ui` entries           | 290                      | 226 (all via tldraw, excalidraw, leva)               |
| Lockfile `@zag-js` + `@ark-ui` entries | 18                       | 158                                                  |
| Lockfile packages, whole repo          | 9,422                    | 9,483                                                |
| Workspace packages                     |                          | −2 (`react-ui-tabs`, `keyboard`), +1 (`react-focus`) |
| Composer boot graph                    | 4,360,490 B (documented) | 4.37 MB                                              |

**Third-party libraries gone from the catalog:** 36 `@radix-ui/*` packages, `aria-hidden`,
`react-remove-scroll`, `tailwindcss-radix`, `react-qr-rounded`, `tabster`, `@fluentui/react-tabster`,
`keyborg`, `react-hotkeys-hook`. Added: `@ark-ui/react` and `@zag-js/hotkeys`. Nine libraries and one
focus stack out, one library family in.

**Custom code retired over the window:** the old Tree (`TreeItem`, `TreeItemHeading`) and the whole
`Treegrid`, the task list's own drag-and-drop module, `CarouselContext`, `ContextMenu.tsx` as a second
menu implementation, `react-ui-menu`'s three renderers and its provider, the `@dxos/keyboard` package,
and the tabster focus scaffolding. In their place: Tree, Tabs, Carousel, Editable, Splitter, Stepper,
Toggle, ToggleGroup, Checkbox, Slider, Collapsible, Tooltip, Popover, Menu, Dialog, AlertDialog,
Select, Toast and QrCode on Zag machines, and `react-focus` for focus groups and hotkeys.

**How the work landed:**

- #12873 Tree on Ark: 47 files, +3.4k / −1.4k
- #12884 tabster and keyboard → `react-focus`
- #12890 task list on the Ark Tree: 62 files, +3.0k / −1.3k
- #12919 migration plan and rail-item rows: 17 files
- #12902 Carousel, Editable, Splitter, Stepper: 39 files, +1.4k / −0.9k
- #12961 the rest of `react-ui` plus the menu redesign: 600 files, +9.2k / −9.1k

**Reading it:**

- Dependency surface is the clear win: 144 Radix import sites and ten libraries replaced by one
  vendor, with focus and hotkeys owned in-repo. The lockfile is not smaller, because Zag ships one
  package per machine (158 entries), but they are one coherent, versioned family.
- Source size grew by about 6.8k lines in the UI packages. That is not the machines themselves; it is
  the wrappers that keep our public APIs stable over Ark's, plus the plan, design notes, regression
  stories, and the new focus package. The port deliberately kept consumer APIs, so the deletions are
  mostly Radix-era glue rather than product code.
- Boot cost is flat against the documented 31 Aug figure: the Zag floating stack is heavier than
  Radix's, the menu split gave that back, and the peak of 4.57 MB at Phase 3 is gone. The 31 Aug tree
  was not rebuilt to re-measure; that number is the one recorded in `check-boot-budget.mjs`.
- Behavioural findings the port surfaced rather than caused: Radix options carried an
  `aria-labelledby` the table e2e relied on, and menus nested under another `Menu.Root` were
  hover-opened child menus. Both are fixed on the branch, and the task-row menus now open on click.

## Appendix A — measurements

Bundle, esbuild `--bundle --minify --format=esm`, React external, gzip:

| entry                                |    gzip |
| ------------------------------------ | ------: |
| `Tabs`                               |  4.9 KB |
| Ark `Tabs`                           | 12.7 KB |
| `Dialog`                             | 11.2 KB |
| Ark `Dialog`                         | 19.9 KB |
| Ark `TreeView`                       | 20.0 KB |
| `Tabs`+`Dialog`                      | 13.5 KB |
| Ark `Tabs`+`TreeView`                | 25.6 KB |
| × 4 (tabs, dialog, popover, tooltip) | 30.6 KB |
| Ark × 4 (same)                       | 41.2 KB |
| Ark whole barrel                     |  297 KB |

Derived: shared core ≈ 7.1 KB gzip (Ark) vs ≈ 2.6 KB (); marginal per component 6–13 KB (Ark)
vs 4–11 KB (). In-app, the Tree's landed cost was +82,205 bytes total JS (+0.12%), +1,652 in
the eager boot graph.

Phase 0, measured the same way (2026-09-03). The four machines together are 101,906 raw / 31,921 gzip
standing alone, and 82,865 raw / 23,795 gzip marginal over a tree already holding `TreeView` +
`Accordion` — the gap between those two is the shared core, and the landed **+95.8 KB** in the boot
graph is the standalone figure, which is what says the core was not eager before (see §2.5):

| entry                                    |     raw |   gzip |
| ---------------------------------------- | ------: | -----: |
| Ark `Steps`                              |  23,405 |  8,228 |
| Ark `Editable`                           |  31,604 | 11,311 |
| Ark `Splitter`                           |  50,658 | 17,686 |
| Ark `Carousel`                           |  43,105 | 14,716 |
| Ark `TreeView`+`Accordion` (pre-Phase 0) |  76,038 | 22,525 |
| Ark, all six                             | 158,903 | 46,320 |

A whole-estate replacement, on the same method: the 32 packages in use dedupe to ≈233 KB raw /
≈75 KB gzip, and Ark equivalents for the behavioural set add ≈263 KB raw / ≈74 KB gzip over what
Phase 0 already ships. **Net ≈ +30 KB raw, ≈ −1 KB gzip** — on the wire it is a wash, because Zag's
machines compress harder (3.6:1 vs 3.1:1) than they minify. Size is not an argument for or against
this migration; the boot graph above is the only place it bites.

Maintenance, 2026-09-02:

|                                       | Ark / Zag            |                                 |
| ------------------------------------- | -------------------- | ------------------------------- |
| stars                                 | 5.4k / 5.2k          | 19.2k                           |
| weekly downloads                      | 1.05M                | 71.4M (`react-dialog`)          |
| open issues + PRs                     | 8 / 22               | 347                             |
| releases, last 12 / 6 / 3 mo          | 31 / 12 / 7          | 9 / 9 / 9                       |
| longest release gap, 3 yr             | 56 d                 | 296 d (2025-08-13 → 2026-06-06) |
| top committer share, last 100 commits | 56% (ark), 74% (zag) | 95%                             |

Both projects are effectively one maintainer. 's ecosystem is ~68× larger by downloads; Ark's
cadence is steady where 's was dormant for ten months and then burst.

## Appendix B — out of scope here

- **Touch drag in the Tree.** `@atlaskit/pragmatic-drag-and-drop`'s element adapter is native HTML5
  DnD (`draggable`/`dragstart`), which does not fire from touch in iPhone WKWebView. Tree reordering
  is desktop-only under Tauri mobile regardless of or Ark. Tracked separately.
- `react-ui-list`'s `Combobox`/`Listbox` and the navtree — covered by the `ark` project.

## Appendix C — component catalogues: Ark, , shadcn

### The three, briefly

- **Ark UI** (`@ark-ui/react`) — a React binding over **Zag**, a set of framework-agnostic UI state
  machines (`@zag-js/*`), one per component. Each component is an _anatomy_ of named parts
  (`Root`/`Trigger`/`Positioner`/`Content`…) stamped with `data-scope`/`data-part`; the
  machine owns state, keyboard, focus and ARIA, and the React layer is thin (`RootProvider` +
  `useX()` for controlled use). Every part and the `ark.<tag>` factory take `asChild`. Ships no CSS;
  styling is `className` per part or a `data-part` stylesheet. Controlled props set machine state,
  not DOM state (§2.5). One shared runtime (~7 KB gz) then single-digit KB per machine (Appendix A).
- ** Primitives** (`@-ui/react-*`, or the unified `-ui`) — React-only headless
  primitives, one package per component, each a compound of context-scoped parts built on a small
  internal toolkit (`Slot`, `Primitive`, `Popper`, `DismissableLayer`, `FocusScope`, `Presence`)
  that consumers can also compose directly — which is how our `Popover`/`Tooltip`/`Menu` became
  forks (§1). State lives in React internals per primitive; scoping is `createContextScope`. Ships no
  CSS; per-component `---*` CSS variables (§2.3). Smaller core, per-package tree-shaking, the
  larger ecosystem, and the single-maintainer cadence in Appendix A.
- **shadcn/ui** — not a library but a **registry of source files you copy into your app**: styled
  components (Tailwind + `class-variance-authority`) over Primitives, with the newer entries
  moving to **Base UI** (`drawer` already depends on `@base-ui/react`) and several wrapping other
  libraries outright (`calendar` → react-day-picker, `command` → cmdk, `resizable` →
  react-resizable-panels, `input-otp`, `sonner`). You own the code after install; there is no
  version to upgrade. It answers a different question from the other two — "what should a form look
  like" rather than "how does a listbox behave" — and its ARIA is whatever the underlying primitive
  emits.

### Catalogue

Every distinct component name across the three, alphabetically, as of 2026-09-02. Sources: Ark from
the installed `@ark-ui/react@5.39.1` (`dist/components/*`, utilities such as `portal`, `presence`,
`focus-trap` and `client-only` excluded); from the `-ui@1.6.7` unified package's
dependency list (internals such as `slot`, `popper`, `dismissable-layer` and the `use-*` hooks
excluded); shadcn from its public registry index (`registry:ui` items, 63). A ✓ under shadcn means
"ships a component by this name", not "ships a primitive". **ARIA role** is what the library puts on
the component's root or primary part, read from Ark's `*.connect.js` and the installed dists
(`a / b` = parts of one pattern, `a | b` = chosen by a prop, "native" = the semantics come from a
native element); blank where the pattern defines no role, or where the package is not installed here
to check. Where the same thing carries a different name the note says which.

| component                 |  Ark   |        | shadcn | ARIA role                         | note                                                                             |
| ------------------------- | :----: | :----: | :----: | --------------------------------- | -------------------------------------------------------------------------------- |
| `accordion`               |   ✓    |   ✓    |   ✓    | `region` (panel)                  |                                                                                  |
| `alert`                   |        |        |   ✓    |                                   |                                                                                  |
| `alert-dialog`            |        |   ✓    |   ✓    | `alertdialog`                     | Ark: `dialog` with `role="alertdialog"`                                          |
| `angle-slider`            |   ✓    |        |        | `slider`                          |                                                                                  |
| `aspect-ratio`            |        |   ✓    |   ✓    |                                   |                                                                                  |
| `attachment`              |        |        |   ✓    |                                   |                                                                                  |
| `avatar`                  |   ✓    |   ✓    |   ✓    |                                   |                                                                                  |
| `badge`                   |        |        |   ✓    |                                   |                                                                                  |
| `breadcrumb`              |        |        |   ✓    |                                   |                                                                                  |
| `bubble`                  |        |        |   ✓    |                                   |                                                                                  |
| `button`                  |        |        |   ✓    |                                   |                                                                                  |
| `button-group`            |        |        |   ✓    |                                   |                                                                                  |
| `calendar`                |        |        |   ✓    |                                   | shadcn wraps react-day-picker; Ark: `date-picker`                                |
| `card`                    |        |        |   ✓    |                                   |                                                                                  |
| `carousel`                |   ✓    |        |   ✓    | `region` / `group`                |                                                                                  |
| `chart`                   |        |        |   ✓    |                                   | Recharts wrappers                                                                |
| `checkbox`                |   ✓    |   ✓    |   ✓    | `checkbox` (native input)         |                                                                                  |
| `clipboard`               |   ✓    |        |        |                                   |                                                                                  |
| `collapsible`             |   ✓    |   ✓    |   ✓    |                                   |                                                                                  |
| `color-picker`            |   ✓    |        |        | `group` / `slider`                |                                                                                  |
| `combobox`                |   ✓    |        |   ✓    | `combobox` / `listbox` / `option` | shadcn composes `command` + `popover`                                            |
| `command`                 |        |        |   ✓    |                                   | a cmdk palette; nearest Ark: `combobox`/`listbox`                                |
| `context-menu`            |        |   ✓    |   ✓    | `menu` / `menuitem`               | Ark: `menu` with `ContextTrigger`                                                |
| `date-input`              |   ✓    |        |        |                                   |                                                                                  |
| `date-picker`             |   ✓    |        |        |                                   | shadcn: `calendar` + `popover`                                                   |
| `dialog`                  |   ✓    |   ✓    |   ✓    | `dialog` \| `alertdialog`         |                                                                                  |
| `direction`               |        |        |   ✓    |                                   | RTL provider, not a component                                                    |
| `drawer`                  |   ✓    |        |   ✓    |                                   | shadcn: `drawer` (on `@base-ui/react`) and `sheet`                               |
| `dropdown-menu`           |        |   ✓    |   ✓    | `menu` / `menuitem`               | Ark: `menu`                                                                      |
| `editable`                |   ✓    |        |        |                                   | our `Editable`                                                                   |
| `empty`                   |        |        |   ✓    |                                   |                                                                                  |
| `field`                   |   ✓    |        |   ✓    |                                   | Ark: label/helper/error for one control; shadcn: the same idea                   |
| `fieldset`                |   ✓    |        |        |                                   |                                                                                  |
| `file-upload`             |   ✓    |        |        | `button` \| `application`         |                                                                                  |
| `floating-panel`          |   ✓    |        |        | `dialog`                          |                                                                                  |
| `form`                    |        |   ✓    |   ✓    |                                   | Form (`react-form`); shadcn: react-hook-form wrappers; Ark: `field` + `fieldset` |
| `hover-card`              |   ✓    |   ✓    |   ✓    |                                   |                                                                                  |
| `image-cropper`           |   ✓    |        |        | `group` / `slider`                |                                                                                  |
| `input`                   |        |        |   ✓    |                                   |                                                                                  |
| `input-group`             |        |        |   ✓    |                                   |                                                                                  |
| `input-otp`               |        |        |   ✓    |                                   | Ark: `pin-input`; : `one-time-password-field`                                    |
| `item`                    |        |        |   ✓    |                                   |                                                                                  |
| `json-tree-view`          |   ✓    |        |        |                                   | devtools has `ObjectsTree` on `tree-view` instead                                |
| `kbd`                     |        |        |   ✓    |                                   |                                                                                  |
| `label`                   |        |   ✓    |   ✓    |                                   |                                                                                  |
| `listbox`                 |   ✓    |        |        | `listbox` / `option`              |                                                                                  |
| `marker`                  |        |        |   ✓    |                                   |                                                                                  |
| `marquee`                 |   ✓    |        |        | `region`                          |                                                                                  |
| `menu`                    |   ✓    |        |        | `menu` / `menuitem`               | one machine for dropdown, context and nested menus                               |
| `menubar`                 |        |   ✓    |   ✓    |                                   | Ark: `menu` per item; no menubar machine                                         |
| `message`                 |        |        |   ✓    |                                   |                                                                                  |
| `message-scroller`        |        |        |   ✓    |                                   |                                                                                  |
| `native-select`           |        |        |   ✓    |                                   | a styled `<select>`                                                              |
| `navigation-menu`         |   ✓    |   ✓    |   ✓    |                                   |                                                                                  |
| `number-input`            |   ✓    |        |        | `spinbutton`                      |                                                                                  |
| `one-time-password-field` |        |   ✓    |        |                                   | Ark: `pin-input`; shadcn: `input-otp`                                            |
| `pagination`              |   ✓    |        |   ✓    |                                   |                                                                                  |
| `password-input`          |   ✓    |        |        |                                   | : `password-toggle-field`                                                        |
| `password-toggle-field`   |        |   ✓    |        |                                   | Ark: `password-input`                                                            |
| `pin-input`               |   ✓    |        |        |                                   | : `one-time-password-field`; shadcn: `input-otp`                                 |
| `popover`                 |   ✓    |   ✓    |   ✓    | `dialog`                          |                                                                                  |
| `progress`                |   ✓    |   ✓    |   ✓    | `progressbar`                     |                                                                                  |
| `qr-code`                 |   ✓    |        |        |                                   |                                                                                  |
| `questionnaire`           |        |        |   ✓    |                                   |                                                                                  |
| `radio-group`             |   ✓    |   ✓    |   ✓    | `radiogroup`                      |                                                                                  |
| `rating-group`            |   ✓    |        |        | `radiogroup` / `radio`            |                                                                                  |
| `resizable`               |        |        |   ✓    |                                   | Ark: `splitter`                                                                  |
| `scroll-area`             |   ✓    |   ✓    |   ✓    | `presentation`                    |                                                                                  |
| `segment-group`           |   ✓    |        |        |                                   |                                                                                  |
| `select`                  |   ✓    |   ✓    |   ✓    | `combobox` / `listbox` / `option` |                                                                                  |
| `separator`               |        |   ✓    |   ✓    | `separator`                       | no Ark part — hand-rolled `role="separator"`                                     |
| `sheet`                   |        |        |   ✓    |                                   | Ark: `drawer`                                                                    |
| `sidebar`                 |        |        |   ✓    |                                   | layout, not a primitive                                                          |
| `signature-pad`           |   ✓    |        |        | `application`                     |                                                                                  |
| `skeleton`                |        |        |   ✓    |                                   |                                                                                  |
| `slider`                  |   ✓    |   ✓    |   ✓    | `slider`                          |                                                                                  |
| `sonner`                  |        |        |   ✓    |                                   | a toast host; Ark: `toast` (`createToaster`)                                     |
| `spinner`                 |        |        |   ✓    |                                   |                                                                                  |
| `splitter`                |   ✓    |        |        | `separator`                       | shadcn: `resizable`                                                              |
| `steps`                   |   ✓    |        |        | `tablist` / `tab` / `tabpanel`    | our `Stepper`                                                                    |
| `switch`                  |   ✓    |   ✓    |   ✓    | `checkbox` (native input)         |                                                                                  |
| `table`                   |        |        |   ✓    |                                   |                                                                                  |
| `tabs`                    |   ✓    |   ✓    |   ✓    | `tablist` / `tab` / `tabpanel`    |                                                                                  |
| `tags-input`              |   ✓    |        |        |                                   |                                                                                  |
| `textarea`                |        |        |   ✓    |                                   |                                                                                  |
| `timer`                   |   ✓    |        |        | `timer`                           |                                                                                  |
| `toast`                   |   ✓    |   ✓    |   ✓    | `status`                          |                                                                                  |
| `toc`                     |   ✓    |        |        |                                   |                                                                                  |
| `toggle`                  |   ✓    |   ✓    |   ✓    | `button` + `aria-pressed`         |                                                                                  |
| `toggle-group`            |   ✓    |   ✓    |   ✓    | `group` \| `radiogroup`           |                                                                                  |
| `toolbar`                 |        |   ✓    |        | `toolbar`                         | no Ark machine — roving focus from `@dxos/react-focus`                           |
| `tooltip`                 |   ✓    |   ✓    |   ✓    | `tooltip`                         |                                                                                  |
| `tour`                    |   ✓    |        |        | `alertdialog`                     |                                                                                  |
| `tree-view`               |   ✓    |        |        | `tree` / `treeitem`               | the reason Ark is in the app                                                     |
| **total**                 | **52** | **30** | **63** | 38 with a role                    | 94 distinct names                                                                |
