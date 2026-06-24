# Deck: deprecating the `Plank` container

Status: design / in‑progress. Tracks the migration of `@dxos/plugin-deck` off the legacy
`containers/Plank/*` composite (which depends on `@dxos/react-ui-stack`) onto the new
presentational components in `src/components/*` (`Pane` / `Plank` / `Companion` / `Splitter`).

The goal is to delete `containers/Plank/*` and `@dxos/react-ui-stack` from the deck and rewrite
`containers/Deck/DeckViewport.tsx` so that all plank chrome, sizing and companion layout come from the
new components, while the deck container retains the capability/operation wiring.

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

- **`DeckViewport`** — sets CSS vars (`--main-spacing`, sidebar widths, dead `--main-content-first/last-width`); `Main.Content`.
- **`DeckContentEmpty`** — first‑run surface.
- **`DeckSoloMode`** — reads `deck.solo/companionOpen/companionVariant/fullscreen`; Escape toggles fullscreen (`LayoutOperation.SetLayoutMode`); renders one `PlankContainer part='solo'`.
- **`DeckMultiMode`** — reads `deck.active[]`, `companionVariant`, `plankSizing`; `Stack orientation='horizontal'` of `PlankSeparator` + `PlankContainer part='multi'`; **companion only on the last plank** (order/itemsCount accounting: last plank with companion = 3 stack items, else 2); saves/restores `scrollLeft`.
- **`PlankSeparator`** — `w-0` (encapsulated) or `w-4` gap.
- **`PlankContainer`** — the bridge. Resolves graph/node/companions (`useAppGraph`, `useNode`, `useCompanions`, `useSelectedCompanion`), reads deck state, gets `useOperationInvoker`, and builds the `Plank.Root > Plank.Content > Plank.Component (+ companion Plank.Component)` tree. Maps callbacks to operations:
  - `onAdjust`: close → `LayoutOperation.Close`/`UpdateComplementary`; solo/fullscreen → `SetLayoutMode`; increment‑start/end → `DeckOperation.Adjust`; companion → `LayoutOperation.UpdateCompanion`.
  - `onResize` → `DeckOperation.UpdatePlankSize`.
  - `onScrollIntoView` → `LayoutOperation.ScrollIntoView`.
  - `onUpdateCompanion` → `LayoutOperation.UpdateCompanion`.

---

## 3. Deck state & operations (`src/capabilities`, `schema.ts`)

```ts
type DeckState = {
  initialized: boolean;
  active: string[];
  inactive: string[];
  solo?: string;
  fullscreen: boolean;
  plankSizing: Record<string, number>; // rem widths keyed by plank id
  companionOpen: boolean;
  companionVariant?: string;
  companionFrameSizing: Record<string, number>;
};
const getMode = (deck) => (deck.solo ? (deck.fullscreen ? 'solo--fullscreen' : 'solo') : 'multi');
```

Operations relevant to layout:

- `DeckOperation.Adjust({ id, type: 'close'|'companion'|'solo'|'solo--fullscreen'|'increment-start'|'increment-end' })`.
- `DeckOperation.UpdatePlankSize({ id, size })` → `plankSizing[id] = size`.
- `LayoutOperation.ScrollIntoView({ subject? })` → `ephemeral.scrollIntoView`.
- `LayoutOperation.UpdateCompanion({ subject })` → toggles `companionOpen` + `companionVariant = getLinkedVariant(subject)`.
- Companion nodes resolved via graph children of type `PLANK_COMPANION_TYPE`.

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

## 7. Open questions

1. Multi‑mode resize substrate: `Mosaic.Tile` per plank (recommended) vs keeping CSS‑var widths. The
   Mosaic resize feature (PR #11932) was built for exactly this.
2. Whether `PlankControls` lives in `containers/` (capability‑aware, recommended) or becomes a thin
   presentational `Pane`‑level control set fed by the container.
3. Solo companion: fixed ratio is dropped in favour of a resizable `Splitter` — confirm the persisted
   size key (reuse `plankSizing` or a new companion key).
