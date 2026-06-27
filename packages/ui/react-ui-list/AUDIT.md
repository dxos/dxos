# List / Tree / Mosaic Components — Audit & Rationalization Plan

Status: **living**. This document is the source of truth for the list-shaped
component stack in `packages/ui/*`. It supersedes the earlier "List & Selection"
audit (which described a pre-consolidation world with `RowList`,
`react-ui-stack`, and search-coupled `Combobox`/`Picker` — all since resolved).

Last full pass: 2026-06-26. Developer-facing primers (component hierarchies):
[`react-ui-list/DESIGN.md`](./DESIGN.md) and
[`react-ui-mosaic/DESIGN.md`](../react-ui-mosaic/DESIGN.md).

Scope of this audit (the packages the brief named, plus the DnD utility package
they all lean on):

1. `@dxos/react-list` — ARIA primitives (Radix-style, unstyled).
2. `@dxos/react-ui` `components/List/*` — older themed `List` / `Tree` /
   `Treegrid` wrappers.
3. `@dxos/react-ui-list` — high-level list components + reusable aspect hooks.
4. `@dxos/react-ui-mosaic` — virtualized Stack / Board / drag-and-drop.
5. `@dxos/react-ui-dnd` — drag-to-resize handle + size utilities (the DnD
   utility layer the above share).

Out of scope: `@dxos/react-ui-table` (grid/table), `@dxos/react-ui-search`
(search-domain composition over `react-ui-list`).

---

## 1. Guiding decisions (from review)

These were agreed with the maintainer and drive the plan below:

1. **`react-ui-list` and `react-ui-mosaic` are the high-quality target layers.**
   Plugins should consistently reach for these. `react-ui-list` owns row/tree
   semantics + the reusable **aspects** (navigation, focus, selection,
   drag-and-drop/ordering, disclosure, grid). `react-ui-mosaic` owns
   virtualization, cards, boards, and heavy DnD layouts.
2. **`react-ui` `List` / `Tree` are legacy and get hard-deprecated.** No
   backwards-compatibility shims — every call site is migrated in the same
   change. (Nothing has shipped; there is no external compatibility to keep.)
3. **`react-list` stays as the ARIA-only primitive layer.** Its purpose is now
   documented in-package (see §3.1). A follow-up tracks adopting it at the ~10
   ad-hoc `<ul>/<li>` call sites.
4. **`react-ui` must never depend on `react-ui-list`.** The dependency edge runs
   `react-ui` → (nothing upward). `react-ui-list` → `react-ui` → `react-list`.
   Anything `react-ui-list` needs that currently lives in `react-ui` (e.g.
   `Treegrid`) moves **up** into `react-ui-list`, or stays in `react-ui` only if
   `react-ui` itself still needs it.
5. **Common aspects live in `react-ui-list`.** Navigation, focus, selection,
   ordering/drag, disclosure, grid are defined once as hooks there and consumed
   by the components. Virtualization stays a `react-ui-mosaic` concern. Several
   components don't yet consume the shared aspects — the convergence analysis is
   §9.
6. **`react-ui-dnd` is the home for shared `@atlaskit` utilities.** Pure type /
   style helpers that don't need atlaskit (`Size`, `Side`, `sizeStyle`) move
   down into `react-ui`; atlaskit-bound helpers (drop indicators, the resize
   handle) consolidate in `react-ui-dnd`.
7. **Each `react-ui-list` component is themed via a single `List.theme.ts`**
   (tailwind-variants), mirroring `react-ui-form`'s `Form.theme.ts`. ✅ Done in
   this pass (§5).

---

## 2. Current dependency graph

```
                        @dxos/react-ui-mosaic
                        Stack · VirtualStack · Tile · Board · SearchStack
                        (virtualization, cards, heavy DnD)
                          │                 │
            depends on    │                 │ depends on
                          ▼                 ▼
   @dxos/react-ui-dnd ◀───┤        @dxos/react-ui-list
   ResizeHandle           │        Listbox · OrderedList · Tree · Accordion
   Size · Side ·          │        Combobox · Picker · Empty · ItemContent
   sizeStyle              │        aspects: navigation/focus/selection/
   (@atlaskit resize)     │                 disclosure/grid/reorder
                          │          │
                          └──────────┤ depends on
                                     ▼
                            @dxos/react-ui
                            List · ListItem · Tree · TreeItem · Treegrid  ← LEGACY
                            ListDropIndicator · TreeDropIndicator
                            (themed wrappers + tx() theme registry)
                                     │
                                     │ depends on
                                     ▼
                            @dxos/react-list
                            List · ListItem (+ Collapsible)  ← ARIA PRIMITIVES
                            useListContext · useListItemContext
```

Adoption (plugin import counts, this pass):

| Package              | Plugin imports | Notes                                         |
| -------------------- | :------------: | --------------------------------------------- |
| `react-ui-mosaic`    |      ~53       | 18 plugins; kanban/inbox/trip/magazine heavy. |
| `react-ui-list`      |      ~28       | 14 plugins; navtree heaviest.                 |
| `react-ui` List/Tree |    see §4.2    | `ListItem` ~7 real call sites; `Treegrid` 3.  |
| `react-ui-dnd`       |       7        | mosaic + chat + deck + calls.                 |
| `react-list`         |       0        | primitive; consumed by the layers above only. |

---

## 3. Per-package inventory

### 3.1 `@dxos/react-list` (ARIA primitive layer) — KEEP

Path: `packages/ui/react-primitives/react-list/src/`.

Exports: `List`, `ListItem` (+ `ListItem.Heading`, `ListItem.OpenTrigger`,
`ListItem.CollapsibleContent`), `useListContext`, `useListItemContext`,
`createListScope`, `createListItemScope`, plus prop types and name constants.

**What it is:** Radix-style structural primitives. `List` renders `<ol>`/`<ul>`
or `role="listbox"` (when `selectable`); `ListItem` renders `<li>`/`role=option`
with `aria-selected` plumbed through context, and optional Radix-Collapsible
disclosure. **No styling, no keyboard navigation** — semantics only.

**Role going forward:** the elemental ARIA layer. Higher layers compose it;
ad-hoc `<ul>/<li>` lists in plugins should adopt it instead of re-deriving ARIA.
Purpose is documented in the package (README / module header) as part of this
pass. See follow-up **F1**.

### 3.2 `@dxos/react-ui` `components/List/*` (legacy themed) — DEPRECATE

Path: `packages/ui/react-ui/src/components/List/`.

| Export                 | Role                                                              | Fate                                                                         |
| ---------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `List`, `ListItem.*`   | Themed wrapper over `react-list` (density, endcap, open-trigger). | **Deprecate.** Migrate ~7 call sites (§4.2) to `react-ui-list`.              |
| `Tree.*`, `TreeItem.*` | Themed tree wrapper (`role=tree`/`treeitem`).                     | **Deprecate.** Only consumer is `react-ui-list` `TreeItem` (drop indicator). |
| `Treegrid.*`           | `role=treegrid` grid layout + tabster row nav.                    | **Move up** into `react-ui-list` (§4.1). Used by it + navtree + devtools.    |
| `ListDropIndicator`    | Tailwind port of atlaskit box drop-indicator.                     | **Move** into `react-ui-dnd` (§4.3) — atlaskit-bound, shared.                |
| `TreeDropIndicator`    | Tailwind port of atlaskit tree-item instruction indicator.        | **Move** into `react-ui-dnd` (§4.3).                                         |

`Treegrid` registers its theme centrally via `react-ui`'s `tx()` system
(`defaultTheme.ts` → `treegrid: treegridTheme`) and consumes `useThemeContext`.
That central registration is the crux of the move — see the design fork in §6.

### 3.3 `@dxos/react-ui-list` (high-level + aspects) — TARGET LAYER

Path: `packages/ui/react-ui-list/src/`.

**Components** (`components/`): `Accordion`, `Combobox`, `Empty`, `ItemContent`,
`Listbox`, `OrderedList`, `Picker`, `Tree`. (The previously-deprecated `List`
reorderable component has already been deleted; `OrderedList` replaced it.)

**Aspects** (`aspects/`) — the reusable hooks the maintainer wants standardized:

| Aspect              | Concern                         | Backing                                |
| ------------------- | ------------------------------- | -------------------------------------- |
| `useListNavigation` | keyboard nav + focus-on-entry   | `@fluentui/react-tabster` arrow groups |
| `useListSelection`  | single/multi selection model    | controllable state                     |
| `useListDisclosure` | single/multi expand model       | controllable state                     |
| `useListGrid`       | row grid template (rail tracks) | CSS grid                               |
| `useReorder*`       | drag-reorder + auto-scroll      | `@atlaskit/pragmatic-drag-and-drop`    |

**Gap vs. decision #5:** _focus_ and _virtualization_ are not yet aspects here.
`Focus` currently lives in `react-ui` (re-exported by mosaic); virtualization is
mosaic-only (correctly). A `useListFocus` aspect (or a documented re-export of
`react-ui` `Focus`) would complete the "common aspects" set — follow-up **F4**.

**Cross-layer couplings to resolve:**

- `Tree/Tree.tsx` + `Tree/TreeItem.tsx` import `Treegrid` / `TreeItem` (as
  `NaturalTreeItem`) from `@dxos/react-ui`. Resolved by §4.1 (Treegrid move) and
  §4.3 (drop-indicator move).
- `OrderedList/OrderedListItem.tsx` imports `ListItem` (as `NaturalListItem`)
  from `@dxos/react-ui` only for `NaturalListItem.DropIndicator`. Resolved by the
  drop-indicator move (§4.3).

### 3.4 `@dxos/react-ui-mosaic` (virtualization/cards/board) — TARGET LAYER

Path: `packages/ui/react-ui-mosaic/src/`.

`Mosaic.{Root,Container,Tile,Stack,VirtualStack,DragHandle,ResizeHandle,
Placeholder,DropIndicator}`, `Board.*`, `SearchStack`, re-exported `Focus`.
Deps: `@tanstack/react-virtual`, full `@atlaskit/pragmatic-drag-and-drop*`
suite (incl. `react-drop-indicator`), `react-ui-dnd` (`ResizeHandle`, `Size`,
`sizeStyle`, `resizeAttributes`), `react-ui-list` (dev).

No structural changes proposed; it consumes `react-ui-dnd` and `react-ui-list`
as intended. The only knock-on: when `Size`/`sizeStyle` move (§4.3), update
mosaic's imports.

### 3.5 `@dxos/react-ui-dnd` (DnD utilities) — KEEP, REPURPOSE

Path: `packages/ui/react-ui-dnd/src/`.

Exports: `ResizeHandle` (+ `resizeAttributes`, `ResizeHandleProps`), `Size`
(`number | 'min-content'`), `Side`, `sizeStyle`.

The maintainer's read: `ResizeHandle` is the only heavyweight and looks "lonely"
in its own package. Rather than delete the package, **repurpose it as the shared
`@atlaskit` utility home** (decision #6): the drop indicators move in (§4.3),
while the non-atlaskit `Size`/`Side`/`sizeStyle` move **down** into `react-ui`
(they're consumed by `plugin-deck` and `plugin-calls` for plain layout, with no
DnD involved) — subject to the naming fork in §6.

---

## 4. Planned moves

### 4.1 `Treegrid` : `react-ui` → `react-ui-list`

Consumers: `react-ui-list` `Tree`, `plugin-navtree` `NavTreeItemColumns`,
`devtools` `ObjectsTree`. Once moved, update those three import sites to
`@dxos/react-ui-list` and drop the `Treegrid` export from `react-ui`.

Blocker: `Treegrid` uses `react-ui`'s central `tx()` theme registry. Two ways
to land it cleanly — see the design fork **D1** in §6. Recommended: convert
`Treegrid.theme.ts` to a self-contained tailwind-variants theme (like the new
`List.theme.ts`) so it carries its own styles and needs no central registration.

### 4.2 `react-ui` `List` / `ListItem` deprecation

These use the simple "styled list with endcap/heading rows" shape — none need drag
or virtualization. Per D2 they migrate to `Listbox` (selection opt-in). The audit
originally listed 7 call sites; a full grep found the surface is **larger** — track
both groups:

**Migrated (✅, Phase 5a):**

- `plugin-connector` `SyncTargetsDialog`
- `plugin-space` `ForeignKeys`, `SpaceSettings`
- `plugin-client` `InvitationsContainer`, `RecoveryCredentialsContainer`
- `plugin-sample` `RelatedItemsList`

**Remaining (⛔, blocks the `react-ui` List/Tree deletion — Phase 5b):**

- `sdk/shell` `IdentityListItem` — uses `ListItem.Root`'s `labelId` prop (ties to
  `Avatar.Root` `aria-labelledby`); a shared `forwardRef` template rendered by the
  parents below, so migrating ripples.
- `sdk/shell` `InvitationList`, `SpaceMemberList`, `DeviceList` — the identity/
  member/device list cluster (sensitive shell UI).
- `plugin-client` `DevicesContainer`
- `plugin-registry` `PluginList`
- `sdk/app-toolkit` playground generator `Main`
- Stories: `plugin-deck` `DeckLayout.stories`, `sdk/shell` `Invitations.stories`,
  `sdk/app-framework` `SurfaceComponent.stories`

Once the remaining group migrates, delete `react-ui` `List`/`Tree`/`TreeItem`
(+ the dead `ListDropIndicator`/`TreeDropIndicator`, already consumer-free) in one
change. `IdentityListItem` needs a `labelId`-equivalent on `Listbox.Item` (or the
Avatar association reworked) — resolve that first.

### 4.3 Drop indicators + `Size`

- **Drop indicators (D4 ✅).** Delete `react-ui`'s `ListDropIndicator` Tailwind
  port; `react-ui-list` `OrderedListItem` switches to `@atlaskit/pragmatic-drag-and-drop-react-drop-indicator/box`
  (the same component `Mosaic.DropIndicator` uses — add the dep to `react-ui-list`).
  `TreeDropIndicator` has no atlaskit drop-in (no `tree-item` renderer ships); it
  moves with `Tree` into `react-ui-list` as a small local port. `react-ui-dnd`
  hosts no drop indicators.
- `Size` / `Side` / `sizeStyle` **stay in `react-ui-dnd`** (D3 ✅). They were
  almost moved down into `react-ui`, but `Size` there would collide with the
  existing `@dxos/ui-types` `Size` (icon/input scale) for a different concept,
  and the only non-DnD consumers (`plugin-calls`, `plugin-deck`) didn't actually
  need the type — both were cleaned to drop the import (see D3 in §6). Genuine
  consumers (`react-ui-dnd`, `react-ui-mosaic`, `react-ui-chat`) keep importing
  from `react-ui-dnd`.

### 4.4 Other `@atlaskit` direct importers (informational)

These import `@atlaskit/pragmatic-drag-and-drop*` directly and are **not** in
scope (domain-specific DnD, not list-shaped): `react-ui-gameboard`,
`react-ui-board`, `lit-grid`, `react-ui-canvas-editor`, `plugin-navtree` (custom
tree DnD). Worth a future pass to see whether any reorder logic could fold into
`react-ui-list`'s `useReorder*`, but not part of this audit.

---

## 5. Theme extraction (done this pass)

Each `react-ui-list` component now reads its classes from a single
`src/components/List.theme.ts` (`listTheme.styles()`), mirroring
`react-ui-form`'s `Form.theme.ts`. Slots cover Accordion, Listbox, OrderedList,
Picker, Combobox, ItemContent, and Empty. Inline `mx('…literal…')` strings were
replaced with slot calls; per-instance overrides flow through `{ class: … }`.
Structural rationale comments moved next to the slot definitions. `react-ui-list`
builds clean.

Not yet themed (intentionally — they're context/DOM-less or atom-driven):
`Tree`/`TreeItem` (their styling is tied to `Treegrid` and moves with §4.1),
`Accordion.Root` (no DOM classes of its own).

Follow-up **F2**: audit `react-ui-form` for _consistent_ theme use (some
literals likely remain outside `Form.theme.ts`), and consider whether the two
themes share structural slots worth hoisting.

---

## 6. Design forks to resolve (need maintainer input)

These are the genuine decisions the moves hinge on; cheap to execute once
decided, expensive to redo if guessed wrong (they set repo-wide conventions).

- **D1 — Treegrid theming. ✅ DECIDED: (b).** When `Treegrid` moves to
  `react-ui-list` (§4.1), convert `Treegrid.theme.ts` to a self-contained `tv`
  theme like `List.theme.ts` rather than keeping `react-ui`'s central `tx()`
  registry — consistent with the theme direction, removes the central-registry
  coupling. (Executes in Phase 3.)

- **D2 — replacement for `react-ui` `List`/`ListItem`. ✅ DECIDED: consolidate on
  `Listbox` (selection opt-in).** All 7 sites (§4.2) move to `Listbox`. Since 5 of
  them aren't single-select, `Listbox` gains **opt-in selection**: with no
  `value`/`defaultValue`/`onValueChange` it renders plain styled rows
  (`role=list`/`listitem`, hover, no `aria-selected`); with them it stays today's
  single-select listbox (existing consumers unaffected — they pass `value`).
  RelatedItemsList & SpaceSettings are **navigate-only** (click fires the action,
  no retained "current" highlight). Once `react-ui` `List` is deleted, rename
  `Listbox` → `List` (it will be the package's general list). Executes in Phase 4
  (API) → Phase 5 (migrate + delete).

- **D3 — resize `Size`. ✅ DECIDED: don't move it.** `Size`/`Side`/`sizeStyle`
  stay in `react-ui-dnd`; they're DnD/resize-domain and only genuinely used by
  `react-ui-dnd` itself, `react-ui-mosaic`, and `react-ui-chat`. The two spurious
  consumers were cleaned instead: `plugin-calls` `ResponsiveGrid` (`useState<Size>`
  → `useState<number>` — the value is always numeric) and `plugin-deck`
  `DeckViewport` (`handleSizeChange` now typed from `MosaicTileProps['onSizeChange']`).
  Both drop the `@dxos/react-ui-dnd` import. No rename, no `react-ui` collision.
  (Done.) Supersedes the §4.3 "move `Size` down" item.

- **D4 — drop-indicator duplication. ✅ DECIDED (revised): CSS-free ports in
  `react-ui-list`; atlaskit in `react-ui-mosaic`.** Deleted `react-ui`'s
  `ListDropIndicator`. The original plan was to standardize on atlaskit's
  `@atlaskit/pragmatic-drag-and-drop-react-drop-indicator/box` everywhere, but that
  component's CJS build `require`s a `.compiled.css` file which **crashes the node
  test loader** (`SyntaxError: Unexpected token '.'`) — and `react-ui-list` is
  transitively imported by many node-tested plugins (e.g. `plugin-settings`'
  ReactSurface), so it broke their activation tests. So `react-ui-list` keeps
  **CSS-free Tailwind ports**: `ListDropIndicator` (box, used by `OrderedList` +
  navtree `L0Menu`) and `TreeDropIndicator` (tree-item `Instruction` — atlaskit
  ships no `tree-item` renderer anyway). `react-ui-mosaic` keeps the atlaskit
  component (it's browser-oriented and not in those node-test graphs).
  - `react-ui-dnd` hosts no drop indicators; it keeps `ResizeHandle` + `Size`/`sizeStyle`.
  - Lesson logged: after adding a dep to a broadly-imported UI package, build the
    full affected graph / run node tests, not just the edited package.

---

## 7. Phased execution plan

Ordered so each phase is independently shippable and later phases assume earlier.

| Phase  | Work                                                                                                                                                                                                                                                                                                                                                                                                            | Risk    | Blocked on   |
| :----: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------------ |
| **0**  | ✅ Theme extraction into `List.theme.ts` (§5).                                                                                                                                                                                                                                                                                                                                                                  | done    | —            |
| **1**  | Document `react-list` purpose in-package (§3.1).                                                                                                                                                                                                                                                                                                                                                                | low     | —            |
| **2**  | ✅ Drop indicators: `react-ui-list` `OrderedList` + navtree `L0Menu` use atlaskit's box `DropIndicator`; `TreeDropIndicator` ported into `react-ui-list`. `Size` resolved in D3. react-ui's port indicators now have no external consumers.                                                                                                                                                                     | done    | —            |
| **3**  | ✅ `Treegrid` moved to `react-ui-list` with a self-contained `tv` theme (D1); navtree + devtools repointed; removed from `react-ui` (files, barrel, theme registry). All four packages build + lint.                                                                                                                                                                                                            | done    | —            |
| **4**  | ✅ `Listbox` made selection opt-in (§4.2, D2) — plain `role=list`/`listitem` rows when no value model; single-select listbox when wired. Backward-compatible; builds + lints.                                                                                                                                                                                                                                   | done    | —            |
| **5a** | 🟡 Migrated 6 sites to `Listbox`: `SyncTargetsDialog`, `ForeignKeys`, `SpaceSettings`, `InvitationsContainer`, `RecoveryCredentialsContainer`, `RelatedItemsList` (all build + lint).                                                                                                                                                                                                                           | partial | —            |
| **5b** | ❌ Delete `react-ui` `List`/`Tree`/`TreeItem` — **blocked**: the real consumer surface is larger than the audit's 7 (see §4.2). The remaining cluster (shell `IdentityListItem`/`InvitationList`/`SpaceMemberList`/`DeviceList`, `DevicesContainer`, plugin-registry `PluginList`, app-toolkit playground, + stories) must migrate first; several involve sensitive shell UI and the `ListItem` `labelId` prop. | blocked | 5a + cluster |
| **6**  | Aspect convergence (§9): `Accordion` → `useListDisclosure`; hoist shared DnD helpers → `react-ui-dnd`; `useListFocus` aspect (F4); `Picker` primitive docs.                                                                                                                                                                                                                                                     | low     | —            |

Phases 1 and 6 and the F-tasks are unblocked and low-risk; phases 2–5 wait on
the D-forks above.

---

## 8. Follow-up tasks (tracked separately)

- **F1 — Adopt `react-list` at ad-hoc list call sites.** _Partially done._
  Migrated the two genuinely-interactive lists: `plugin-sequencer` `TrackList`
  (hand-rolled `role=listbox` → `Listbox`) and `plugin-sidekick` `ActionItems`
  (→ `react-list` `List`/`ListItem` structure). **Deferred:** `plugin-code`
  `FileTree` uses `aria-pressed` for selection (the anti-pattern §10 warns about)
  and is a nested collapsible tree — migrating it properly needs `Tree`/`Treegrid`
  here first (blocked on §4.1). The remaining hits are static display `<ul>`s
  (alerts, diagnostics, build/error output, link lists) that already carry correct
  implicit list semantics — `react-list` adds no value there, so left as-is.
- **F2 — `react-ui-form` theme consistency.** _Partially done._ Moved the
  form-chrome structural literals into `Form.theme.ts` slots (`actions`, `submit`,
  `fieldSetBody`, `fieldSetBox`, `fieldSetBoxOuter`) and wired `FormActions`,
  `FormSubmit`, `FormFieldSetContainer` to them (removing a `// This should be
styled` TODO). **Proposed, not implemented** (per the task): (a) field-specific
  grids in `ArrayField`/`DateField`/`GeoPointField`/`SelectOptionField` — several
  are `OrderedList.Item` overrides that belong in `List.theme.ts`, not the form
  theme; (b) a shared layout-slot helper in `@dxos/ui-theme` for the patterns that
  recur across `Form.theme.ts` and `List.theme.ts` — `dx-container` viewport,
  `flex flex-col` content, the `ring-1 …` detail box, and the 2-/3-column action
  grids. Worth doing once a third consumer appears; premature with two.
- **F4 — Focus aspect.** See Phase 6 / §9 action 3.

---

## 9. Aspect convergence (unify behaviour across components)

`react-ui-list` ships a coherent aspect set — `useListNavigation`,
`useListSelection`, `useListDisclosure`, `useListGrid`, `useReorder*` — but only
two components actually consume it. The rest re-derive navigation / selection /
disclosure independently. Current reality:

| Component      | Keyboard nav           | Selection / current       | Disclosure          | Reorder            |
| -------------- | ---------------------- | ------------------------- | ------------------- | ------------------ |
| `Listbox`      | `useListNavigation`    | `useListSelection`        | —                   | —                  |
| `OrderedList`  | `useListNavigation`    | (`aria-current` row prop) | `useListDisclosure` | `useReorder*`      |
| `Tree`         | `Treegrid` (own)       | `TreeModel` atom          | `TreeModel` atom    | direct `@atlaskit` |
| `Accordion`    | — (Radix)              | —                         | Radix Accordion     | —                  |
| `Picker`       | own (activedescendant) | own `selectedValue`       | —                   | —                  |
| `Combobox`     | via `Picker`           | via `Picker`              | —                   | —                  |
| mosaic `Stack` | `Focus.Group` (own)    | Container `currentId`     | —                   | direct `@atlaskit` |

The divergences are **not** all accidental — three are deliberate and shouldn't
be forced into the useState-based aspects:

- **`Tree` uses an `@effect-atom` `TreeModel`** so each node subscribes
  independently and only changed rows re-render. The aspects are `useState`-based
  (whole-list re-render) — correct for bounded lists, wrong for large trees.
- **`Picker` keeps browser focus on the input** and highlights via
  `aria-activedescendant`. `useListNavigation` is roving-tabindex — a different
  WAI-ARIA pattern. They cannot share the same DOM focus model.
- **mosaic's reorder is cross-container, virtualized, placeholder-based.**
  `useReorderList` is single-list. Different scope, not duplication to collapse.

### Recommended convergence actions

Ordered by value / safety:

1. **`Accordion` → `useListDisclosure('multi')`** _(low risk, real win)._ Replace
   the Radix-Accordion state/ARIA with the aspect; keep the CSS slide animation.
   Unifies disclosure semantics + `aria-controls`/`aria-labelledby` id wiring
   with `OrderedList`, and drops a Radix dependency from the component.
2. **Extract shared low-level DnD helpers into `react-ui-dnd`** _(low risk)._
   `useReorder*` (react-ui-list) and mosaic both hand-roll closest-edge +
   auto-scroll wrappers over the same `@atlaskit` packages. Hoist the thin
   wrappers (edge extraction, `autoScrollForElements` ref) into `react-ui-dnd`
   (the shared atlaskit home, decision #6) and have both consume them. Keeps the
   two reorder _controllers_ separate but removes the duplicated plumbing.
3. **Formalize a `useListFocus` aspect (or bless `Focus` as the aspect)**
   _(low risk)._ mosaic and the multi-pane chrome use `react-ui` `Focus`; the
   aspect set has no focus member. Either re-export `Focus` from `react-ui-list`
   `aspects` with docs, or wrap it as `useListFocus` so "focus" sits alongside
   navigation/selection/disclosure in one place. (This is follow-up F4.)
4. **Document `Picker` as the canonical activedescendant primitive** _(docs)._
   Rather than force it onto `useListNavigation`, name it explicitly in the
   primer (done in `DESIGN.md`) as the input-driven counterpart to the
   roving-tabindex lists, so developers know which to reach for.
5. **`OrderedList` selection → `useListSelection`** _(optional)._ `OrderedList`
   sets `aria-current` directly via an item prop rather than through the
   selection aspect. If a list needs genuine single-select-follows-focus it
   should adopt `useListSelection`; the current `aria-current` row highlight is a
   lighter "active layer" signal and may be left as-is. Decide per real consumer.
6. **`Tree` — leave the model atom-based.** Do _not_ migrate `Tree` onto the
   useState aspects. The only safe sharing is the keyboard/ARIA surface once
   `Treegrid` moves into this package (§4.1) — at that point `Treegrid`'s row
   navigation and `useListNavigation('grid')` could be reconciled, but only if it
   doesn't compromise per-node reactivity. Treat as a separate investigation.

Actions 1–4 are unblocked and low-risk; fold them into Phase 6 (or land
independently). Action 2 dovetails with the §4.3 `react-ui-dnd` consolidation.

## 10. `dx-*` selection grammar (reference — unchanged, still authoritative)

The ARIA ↔ utility pairing every list row must honour:

- `aria-selected` ↔ `dx-selected` (the chosen row; listbox/option semantics).
- `aria-current` ↔ `dx-current` ("you-are-here" navigation; navtree/breadcrumbs).
- `dx-hover` is free and composes with either.
- `aria-pressed` / `aria-checked` / `aria-expanded` are **not** row-selection
  attributes — do not pair them with `dx-selected`.

Definitions: `packages/ui/ui-theme/src/css/components/{state,focus}.css`
(documented in `state.md`).
The current `react-ui-list` components follow this correctly (`Listbox.Item`,
`Picker.Item` use `dx-selected`; `OrderedList.Item` uses `dx-current`).

---

## 11. Testing plan (manual storybook inspection)

Run storybook (`moon run storybook-react:serve`, port 9009) and inspect the
stories below. Grouped by the change that touched them; expected-visual-outcome
is called out per group. (Whole stack builds + lints green after every phase.)

### A. react-ui-list theme extraction (Phase 0) — expect NO visual change

Class-preserving refactor (static `tv` slots emit the same Tailwind). Inspect for
regressions: spacing, hover, selected/`dx-*` states, truncation. Stories pre-existed.

| Story                          | Check                                              |
| ------------------------------ | -------------------------------------------------- |
| `ui/react-ui-list/Accordion`   | header hover, caret rotation, body slide animation |
| `ui/react-ui-list/Combobox`    | trigger text/placeholder, list padding, item rows  |
| `ui/react-ui-list/Empty`       | centered message + icon                            |
| `ui/react-ui-list/ItemContent` | icon/title/description grid alignment              |
| `ui/react-ui-list/Picker`      | item hover/selected, gutter padding                |

### B. Treegrid move + theme conversion (Phase 3) — expect NO visual change

`Treegrid` moved react-ui → react-ui-list and its theme went from the central
`tx()` registry to a self-contained `tv` theme. Should look identical.

| Story                       | Check                                                                                  |
| --------------------------- | -------------------------------------------------------------------------------------- |
| `ui/react-ui-list/Treegrid` | **(new, ported)** per-level indentation (levels 1–8), bold root row, arrow-key row nav |
| `ui/react-ui-list/Tree`     | (consumes Treegrid) indentation, row hover, expand/collapse                            |
| in-app: navtree sidebar     | NavTreeItemColumns renders; devtools ObjectsTree renders                               |

### C. Drop-indicator swap to atlaskit (Phase 2) — drag to verify the indicator

`OrderedList` + navtree `L0Menu` now draw the atlaskit box `DropIndicator`
(theme-aware `bg-accent-bg`); `Tree` uses the ported instruction indicator.

| Story / surface                | Check                                                         |
| ------------------------------ | ------------------------------------------------------------- |
| `ui/react-ui-list/OrderedList` | drag a row — line+terminal indicator appears at the drop edge |
| `ui/react-ui-list/Tree`        | drag a node — sibling/child instruction indicator appears     |
| in-app: navtree L0 sidebar     | drag an L0 item — box drop indicator appears                  |

### D. Listbox selection opt-in (Phase 4)

| Story                                | Check                                                                           |
| ------------------------------------ | ------------------------------------------------------------------------------- |
| `ui/react-ui-list/Listbox`           | existing stories: row hover, `dx-selected`, label truncation                    |
| `ui/react-ui-list/Listbox` → `Plain` | **(new)** opt-in mode: rows are `role=listitem`, hover only, no `aria-selected` |

### E. Migrated call sites → Listbox (Phase 5a) — behaviour change, inspect closely

Mostly in-app (no isolated story except where noted). All now render via `Listbox`
plain rows (`role=list`); verify hover + the per-row affordance still works.

| Site                                           | Storybook / where                               | Check                                            |
| ---------------------------------------------- | ----------------------------------------------- | ------------------------------------------------ |
| `plugin-space` `SpaceSettings`                 | `plugins/plugin-space/containers/SpaceSettings` | space rows + settings icon button click          |
| `plugin-space` `ForeignKeys`                   | in-app (object settings)                        | rows + delete button                             |
| `plugin-connector` `SyncTargetsDialog`         | in-app (sync dialog)                            | checkbox per row toggles; label click toggles    |
| `plugin-client` `InvitationsContainer`         | in-app (devices/identity)                       | available/redeemed rows; copy button             |
| `plugin-client` `RecoveryCredentialsContainer` | in-app                                          | read-only rows (cursor-default), key icon + date |
| `plugin-sample` `RelatedItemsList`             | in-app (sample object)                          | navigate-only rows (click navigates), caret      |

### F. Earlier ad-hoc migrations (F1) — new stories

| Story                                 | Check                                                                                 |
| ------------------------------------- | ------------------------------------------------------------------------------------- |
| `plugins/plugin-sequencer/TrackList`  | `Listbox`: click selects, arrow nav, mute/remove don't select, Add track outside list |
| `plugins/plugin-sidekick/ActionItems` | `react-list` rows: checkboxes toggle, strike-through, empty state                     |

### G. No render change — no inspection needed

`ui/react-list/List` (docs only); `plugin-calls` `ResponsiveGrid` + `plugin-deck`
`DeckViewport` (D3, type/import only). The yet-to-migrate react-ui List consumers
(§4.2 remaining group) are unchanged and still render via `react-ui` `List`.

## 12. References

- `packages/ui/react-ui-list/DESIGN.md` + `packages/ui/react-ui-mosaic/DESIGN.md` (developer primers)
- `packages/ui/react-ui-list/src/aspects/` (the shared aspect hooks)
- `packages/ui/react-primitives/react-list/src/`
- `packages/ui/react-ui/src/components/List/{List,Tree,Treegrid,ListDropIndicator,TreeDropIndicator}.tsx`
- `packages/ui/react-ui/src/theme/defaultTheme.ts` (theme registry)
- `packages/ui/react-ui-list/src/components/` + `src/aspects/` + `src/components/List.theme.ts`
- `packages/ui/react-ui-mosaic/src/components/{Mosaic,Board}/`
- `packages/ui/react-ui-dnd/src/`
- `packages/ui/react-ui-form/src/components/Form/Form.theme.ts` (theme pattern reference)
- Call sites: `plugin-navtree` `NavTreeItemColumns`, `devtools` `ObjectsTree`,
  `plugin-deck` `DeckViewport`, `plugin-calls` `ResponsiveGrid`,
  `plugin-connector` `SyncTargetsDialog`, `plugin-space` `{ForeignKeys,SpaceSettings}`,
  `plugin-client` `{InvitationsContainer,RecoveryCredentialsContainer}`,
  `plugin-sample` `RelatedItemsList`, `sdk/shell` `IdentityListItem`.
