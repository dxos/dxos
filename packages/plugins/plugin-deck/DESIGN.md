# Deck: deprecating the `Plank` container

Status: complete. Documents the migration of `@dxos/plugin-deck` off the legacy
`containers/Plank/*` composite (which depended on `@dxos/react-ui-stack`) onto the
presentational components in `src/components/*` (`Pane` / `Plank` / `Companion` / `Splitter`), and is
kept as a reference for the resulting `Deck`/`Plank` component architecture — including the
single-mode presentation and URL-sync flow (both in section 3) that landed afterwards.

`containers/Plank/*` and the `@dxos/react-ui-stack` dependency have been deleted;
`containers/Deck/DeckViewport.tsx` builds all plank chrome, sizing and companion layout from the
components in `src/components/*`, while the deck container retains the capability/operation wiring.

---

## 1. Old `Plank` container (`src/containers/Plank/`)

A stateful composite that bundles chrome, layout, sizing, focus, scroll and capability wiring. Public
surface is the `Plank.*` namespace (`PlankRoot`, `PlankComponent`, `PlankContent`) plus `PlankError`
and `PlankLoading`.

### `Plank.Root` — `PlankRoot.tsx`

Headless Radix context provider (`usePlankContext`). Carries everything the subtree needs:

```ts
type PlankContextValue = {
  graph: Graph.ExpandableGraph;
  part: ResolvedPart; // 'solo' | 'multi' | 'complementary' | 'solo-primary' | 'solo-companion'
  layoutMode: LayoutMode; // 'multi' | 'solo' | 'solo--fullscreen'
  settings?: Settings.Settings;
  popoverAnchorId?: string;
  scrollIntoView?: string; // id of plank to scroll into view
  plankSizing?: Record<string, number>; // persisted widths (rem) keyed by plank id
  onAdjust?: (id: string, type: DeckOperation.PartAdjustment) => void;
  onResize?: (id: string, size: number) => void;
  onScrollIntoView?: (id?: string) => void;
  onUpdateCompanion?: (companion: string | null) => void;
};
```

### `Plank.Component` — `PlankComponent.tsx`

Renders a single plank. Two paths:

- **solo** (`part` startsWith `solo`) → wraps in the new `Pane.Root` (already migrated).
- **multi** → wraps in `StackItem.Root` (react‑ui‑stack) with `size`/`onSizeChange`/`StackItem.ResizeHandle`.

Responsibilities (the important ones to preserve):

- **Attention**: `attentionId = isCompanion ? (primary?.id ?? id) : id`; `useAttentionAttributes` applied when attendable.
- **Sizing**: multi planks are `StackItemSize` (`DEFAULT_SIZE = 48`, `DEFAULT_COMPANION_SIZE = 35` rem), resize debounced 200ms → `onResize`.
- **Scroll‑into‑view**: JS smooth scroll via `requestAnimationFrame` driven by the `scrollIntoView` state.
- **Focus / keyboard**: Escape → focus main, Enter → first focusable.
- **Content**: `Surface.Surface` with `AppSurface.Article` data.

### `PlankHeading.tsx` (internal)

48px heading rail: `AttentionSigil` (graph actions via `Graph.getActions()`, `Graph.expand(graph, id, 'child')` on mount), title, `PlankControls`, and — for companions — a companion tab strip. Dispatches `DeckOperation.PartAdjustment` (via `onAdjust`) and `LayoutOperation.UpdateCompanion` (via `onUpdateCompanion`). `attendableId = primaryId ?? id`; `related = part === 'complementary'`.

### `PlankContent` — `PlankContent.tsx`

Solo: absolute grid (`railGridHorizontal`) with optional `6fr_4fr` companion split. Multi: pass‑through. Applies `settings.encapsulatedPlanks` (border/rounded/overflow).

### `PlankControls.tsx` (internal)

Capability‑driven `ButtonGroup`: solo/fullscreen, increment‑start/end, close, open‑companion. `PlankCompanionControls` = single close button → `LayoutOperation.UpdateCompanion({ subject: null })`.

### `PlankError` / `PlankLoading`

`PlankError`: heading + 5s loading placeholder then `PlankErrorFallback`. `PlankLoading`: empty grid placeholder (skeleton TODO #8259).

### react‑ui‑stack dependencies to remove

`StackItem` (`.Root`/`.ResizeHandle`), `StackItemSize`, `railGridHorizontal`, `Stack` (used by `DeckMultiMode`), `DEFAULT_HORIZONTAL_SIZE`.

---

## 2. `DeckViewport` consumption (`src/containers/Deck/DeckViewport.tsx`)

- **`DeckViewport`** — sets CSS vars (`--main-spacing`, sidebar widths); `Main.Content`.
- **`DeckContentEmpty`** — first‑run surface.
- **`DeckPlanks`** — single-mode replacement for the old `DeckSoloMode`/`DeckMultiMode` split. Renders `deck.active` through one `Mosaic.Container > ScrollArea > Mosaic.Stack` pipeline; each `DeckPlankTile` is styled by the presentation derived from plank count and breakpoint (`useDeckPresentation`) — fullbleed for a singleton deck, a flush tiling split for exactly two, resizable sliding tiles for three or more, always sliding with full-width scroll-snap planks below `md`. Planks stay mounted across 1↔2 transitions. Fullscreen is a transient overlay keyed off `EphemeralDeckState.fullscreen` (a plank id): when set, it renders only that plank headless in place of the whole stack; Escape and the exit button both toggle it via `DeckOperation.Adjust({ type: 'fullscreen' })`. Saves/restores `scrollLeft` across fullbleed↔sliding transitions.
- **`DeckPlankTile`** — the `Mosaic.Stack` tile wrapping `DeckPlank`; for sliding tiles wires `size`/`onSizeChange` to `plankSizing`/`DeckOperation.UpdatePlankSize`.
- **`DeckPlank`** (`useDeckPlank` hook) — the bridge, replacing the legacy `PlankContainer`/`PlankComponent`/`PlankHeading` tree. Resolves graph/node/companions (`useAppGraph`, `useNode`, `useCompanions`, `useSelectedCompanion`), reads deck state, gets `useOperationInvoker`, and builds a `Splitter.Root > Plank (+ companion Companion)` tree. Maps callbacks to operations:
  - `onAdjust`: close → `LayoutOperation.Close`/`UpdateComplementary`; fullscreen → `DeckOperation.Adjust({ type: 'fullscreen' })`; increment‑start/end → `DeckOperation.Adjust`; companion → `LayoutOperation.UpdateCompanion`.
  - `onResize` → `DeckOperation.UpdatePlankSize`.
  - `onScrollIntoView` → `LayoutOperation.ScrollIntoView`.
  - `onUpdateCompanion` → `LayoutOperation.UpdateCompanion`.

---

## 3. Deck state & operations (`src/capabilities`, `schema.ts`)

There is a single deck mode: presentation is derived from plank count and breakpoint rather than
stored (fullbleed for 1, tiling for 2, sliding for 3+; always sliding below `md`).

```ts
type DeckState = {
  active: string[]; // presentation derives from length + breakpoint
  inactive: string[];
  plankSizing: Record<string, number>; // rem widths keyed by plank id; sliding presentation only
  tilingSizing?: number[]; // tiling split ratio, relative widths keyed by position
  companionOpen: boolean;
  companionFrameSizing: Record<string, number>;
};

type EphemeralDeckState = {
  fullscreen?: string; // plank id shown headless as a transient overlay; never persisted, never in the URL
  // ...dialog/popover/toast fields
};
```

The selected companion variant lives in `react-ui-attention` view state (global, localStorage), not on
`DeckState` — see `util/companion-view-state.ts`.

Operations relevant to layout:

- `DeckOperation.Adjust({ id, type: 'close'|'companion'|'fullscreen'|'increment-start'|'increment-end' })` —
  `'fullscreen'` toggles `EphemeralDeckState.fullscreen` rather than mutating `active`.
- `DeckOperation.UpdatePlankSize({ id, size })` → `plankSizing[id] = size`.
- `LayoutOperation.ScrollIntoView({ subject? })` → `ephemeral.scrollIntoView`.
- `LayoutOperation.UpdateCompanion({ subject })` → toggles `companionOpen`; the selected variant is read
  from view state, not stored on `DeckState`.
- `LayoutOperation.Open({ subject, disposition? })` — `disposition` (`'solo' | 'add' | 'auto'`):
  `'solo'` (the default) navigates — the deck becomes just the subjects, unless already open; `'add'`
  inserts new planks after `pivotId` or at the end (`addSubjectsToActiveDeck` in `layout.ts`); `'auto'`
  follows the deck — adds beside the origin (`pivotId` ?? attended plank) when sliding, else navigates
  solo. Nav-tree plain click passes `'solo'` (shift → `'add'`); in-plank links/cards pass `'auto'`
  (shift → `'add'`). See `PLUGIN.mdl` F-7 for the navigation model.
- Companion nodes resolved via graph children of type `PLANK_COMPANION_TYPE`.

### URL sync

`capabilities/url-handler.ts` parses the pathname's pair chain (`/w/<workspace>/<key>/<id>/...`) via
`UrlPath.parse` and `PathResolution.resolveUrl`, dispatches `LayoutOperation.Set` with the resolved plank
ids, and reverse-serializes `deck.active` (plus the attended plank's open companion) back into the same
grammar via `serializeDeckToUrl` (`util/serialize-deck-url.ts`) on every deck/attention/companion-variant
change. Attention itself is never serialized — on load it defaults to the last plank in the chain. See
`agents/superpowers/specs/2026-07-19-url-mapping-deck-structure-design.md` for the full URL grammar.

---

## 4. New presentational components (`src/components/`)

| Component                                      | Props (current)                                                                                                               | Role                                                                                 |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `Pane.{Root,Toolbar,Sigil,Title,Tabs,Content}` | radix slots; `Title`/`Tabs` take `attendableId`/`related`; `Tabs` take `tabs: PaneTab[]`, `value`, `onValueChange`, `maxTabs` | dumb 48px‑toolbar chrome; attention‑aware sigil/title/tabs; no node, no capabilities |
| `Plank`                                        | `{ node, attendableId?, actions?: AttentionSigilAction[][], onAction?, controls?, classNames? }`                              | node → `Pane` + Article `Surface`; sets the node's attendable region                 |
| `Companion`                                    | `{ companions: Node[], value?, onValueChange?, attendableId?, controls?, classNames? }`                                       | companion tabs in toolbar + all panels mounted (inactive hidden)                     |
| `Splitter`                                     | `{ main, companion?, open?, orientation?, size?, defaultSize?, onSizeChange?, minSize?, maxSize?, classNames? }`              | resizable main + companion (rem, min/max both panes); `open` hides‑not‑unmounts      |

`Mosaic.Tile` (from `@dxos/react-ui-mosaic`, PR #11932) gains `size`/`onSizeChange`/`minSize`/`maxSize` + `Mosaic.ResizeHandle` — the intended substrate for multi‑mode plank widths.

---

## 5. Gap analysis — old functionality vs new components

| #   | Old functionality                                                                                                       | New coverage                                               | Gap / where it must live in the rewrite                                                                                                                                  |
| --- | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Plank chrome (sigil + title + content)                                                                                  | ✅ `Plank`                                                 | none                                                                                                                                                                     |
| 2   | Companion tab strip + mounted panels                                                                                    | ✅ `Companion`                                             | none                                                                                                                                                                     |
| 3   | Solo `6fr_4fr` companion split                                                                                          | ✅ `Splitter` (resizable, replaces fixed ratio)            | behaviour change: ratio → resizable rem; acceptable improvement                                                                                                          |
| 4   | **Control buttons** (solo/fullscreen, increment‑start/end, close, open‑companion; capability‑gated visibility)          | ⚠️ only a `controls` slot                                  | **MISSING** — rebuild a deck‑local `PlankControls` (capability/operation‑aware) and pass via `controls`. Keep it in `containers/`, not `components/`.                    |
| 5   | Sigil **graph actions** (`Graph.getActions`, `Graph.expand(child)`, `onAction`)                                         | ⚠️ `Plank` takes `actions`/`onAction` but resolves nothing | **MISSING wiring** — container resolves actions + expands graph, passes to `Plank`.                                                                                      |
| 6   | **Multi‑mode plank widths / resize** (`StackItem` size + `ResizeHandle` + `plankSizing` + `UpdatePlankSize`, debounced) | ⚠️ `Mosaic.Tile` resize exists; `Plank` has no `size`      | **MISSING integration** — wrap each multi plank in `Mosaic.Tile` with `size`/`onSizeChange`→`UpdatePlankSize`, `minSize`/`maxSize`; replace `Stack` with `Mosaic.Stack`. |
| 7   | **Scroll‑into‑view** (smooth JS scroll on `scrollIntoView` state)                                                       | ❌ none                                                    | **MISSING** — re‑implement against the Mosaic stack scroll container (Mosaic exposes `scrollTo`).                                                                        |
| 8   | **Focus / keyboard** (Esc → main, Enter → first focusable)                                                              | ⚠️ `Pane.Root` focusable only                              | **MISSING** — re‑add via a hook or container handler.                                                                                                                    |
| 9   | **Error / Loading** (`PlankError` 5s→fallback, `PlankLoading`)                                                          | ❌ none                                                    | **MISSING** — error boundary + loading around the Article `Surface` (container or `Plank` opt‑in).                                                                       |
| 10  | **Encapsulated planks** styling (`settings.encapsulatedPlanks`, `--main-spacing`)                                       | ❌ none                                                    | **MISSING** — apply at the stack/tile level in the rewrite.                                                                                                              |
| 11  | `popoverAnchorId` threaded to sigil/heading                                                                             | ❌ not on `Plank`                                          | **MISSING** — add prop or feed through `controls`/sigil.                                                                                                                 |
| 12  | `related` attention for `complementary` part                                                                            | ✅ `Pane.Title`/`Tabs`; ⚠️ not exposed on `Plank`          | minor — expose `related?` on `Plank` if complementary planks need it.                                                                                                    |
| 13  | `pending` / `debug` flags                                                                                               | ❌ none                                                    | low priority; drop unless needed.                                                                                                                                        |
| 14  | Multi‑mode separators + order/itemsCount accounting                                                                     | n/a (Stack‑specific)                                       | **replace** with `Mosaic.Stack` gap/spacing; companion‑on‑last‑plank logic stays in the container.                                                                       |

**Net:** the presentational pieces (1–3) are done. The rewrite must re‑home the capability/operation
concerns (4,5,7,9,11) into the deck container, and integrate Mosaic for sizing/scroll (6,7,14).
Items 8,10 are layout polish; 12,13 are minor.

---

## 6. Rewrite plan for `DeckViewport`

1. **Deck‑local `PlankControls`** (`containers/Deck/`): port the capability‑gated `ButtonGroup`
   (solo/fullscreen, increment‑start/end, close, open‑companion) as a plain component that takes a
   `capabilities` object + an `onAction(type)` callback. No react‑ui‑stack.
2. **`useDeckPlank(id, part)` hook**: resolve node, companions, selected companion, graph actions,
   attention, and the capability flags + operation dispatchers (`Adjust`/`UpdatePlankSize`/
   `ScrollIntoView`/`UpdateCompanion`). This replaces the `PlankContainer` bridge logic.
3. **`PlankContainer` rewrite**: render `<Plank node controls={<PlankControls…/>} actions onAction/>`;
   when a companion is open, wrap `main` + `<Companion …/>` in `<Splitter open orientation>`.
4. **Solo mode**: `DeckSoloMode` → single `PlankContainer part='solo'` (Splitter handles the companion).
5. **Multi mode**: replace `Stack` with `Mosaic.Stack`; each plank a `Mosaic.Tile` with
   `size = plankSizing[id]`, `onSizeChange → UpdatePlankSize`, `minSize`/`maxSize`; companion still
   only on the last plank (now via the last tile's `Splitter`). Encapsulation spacing on the stack.
6. **Scroll‑into‑view**: drive the Mosaic stack's `scrollTo` from the `scrollIntoView` state.
7. **Error/Loading**: wrap the Article `Surface` with an error boundary + loading fallback (port
   `PlankError`/`PlankLoading`).
8. **Delete** `containers/Plank/*` and remove `@dxos/react-ui-stack` from `package.json`; update all
   imports; run build + lint + the deck storybook.

### 6a. Plank-capability gaps found while reading the old container

The old `PlankHeading`/`PlankComponent` carry more than the new `Plank` currently exposes; the rewrite
must feed these through. The chosen approach is to **keep using the higher-level `Plank` and pass the
deck/framework pieces in via slots + a surface-data override** (consistent with the locked
"deck-container `PlankControls`" decision — the container composes, `Plank` stays slot-driven):

- **NavbarEnd surface** (`AppSurface.NavbarEnd`) — extra toolbar content → new `navbarEnd?: ReactNode` slot on `Plank`.
- **Sigil menu footer** (`AppSurface.MenuFooter`) — sigil-menu children → new `sigilFooter?: ReactNode` slot.
- **Surface-data extras** (`companionTo`, `variant`, `path`, `popoverAnchorId`) → new `articleData?: Partial<AppSurface.ArticleData>` merged into the computed `data`.
- **`popoverAnchorId` `Popover.Anchor`** wrapping the sigil when `popoverAnchorId === \`${meta.key}:${node.id}\``→ handled inside`Plank`from the`popoverAnchorId`.
- **Error fallback + loading placeholder** → `fallback?`/`placeholder?` passthrough to the Article `Surface` (port `PlankError`/`PlankLoading`).
- **`related?`** (complementary) and **`pending?`** → `Plank` props (forwarded to `Pane.Title`).
- **Sigil actions** are resolved in `useDeckPlank` (combine passed `actions` + `Graph.getActions(node.id)` filtered by disposition) and passed to `Plank`'s `actions`/`onAction`.

These are additive to `Plank` (defaults preserve current behaviour for the Matrix/Pane stories).

Sequencing keeps the build green: 1–2 (additive), 3–4 (solo first, verify), 5 (multi), 6–7 (polish),
8 (delete + dependency removal last).

---

## 7. Open questions (resolved)

1. **Sliding-presentation resize substrate**: resolved as `Mosaic.Tile` per plank (`DeckPlankTile` in
   `DeckViewport.tsx`), each wired to `plankSizing`/`DeckOperation.UpdatePlankSize`.
2. **`PlankControls` location**: resolved — it lives in `containers/Deck/PlankControls.tsx`,
   capability-aware, composed by `DeckPlank`.
3. **Solo companion ratio**: resolved — the fixed ratio was dropped in favour of a resizable
   `Splitter.Root`, persisting its split size via `useCompanionSplit`.
