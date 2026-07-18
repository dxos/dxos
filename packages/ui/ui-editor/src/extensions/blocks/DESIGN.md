# Block selection, drag, and clipboard

Design for gutter-driven block selection in the editor: select whole blocks
(paragraphs, list items, headings, …), drag them to reorder, and cut/copy/paste
them. The machinery is **document-agnostic** — markdown top-level blocks and
outliner task lines are both just "documents" that supply the same operations.

## Concept

A **block selection** is an ordered set of whole blocks, distinct from
CodeMirror's text selection. It drives which gutter drag handle is shown, what a
drag moves, and what cut/copy/paste act on. When empty, the editor behaves
exactly as before (text-selection cut/copy/paste, single-block drag from the
cursor's block).

## Operations contract

Both documents provide the same options bag; nothing below is markdown-specific.

```ts
type Block = { from: number; to: number };

type BlockOps = {
  // Blocks in document order; ranges non-overlapping. Memoized per state.
  getBlocks: (state: EditorState) => Block[];
  // Move the blocks at `sourceIndices` to the slot before `dropIndex` (end when
  // dropIndex === blocks.length), preserving their relative order, as one edit.
  moveBlocks: (view, sourceIndices: number[], dropIndex: number) => void;
  // Serialize blocks to text for the clipboard (markdown joins with a blank line;
  // the outliner joins with newlines).
  serialize: (state, blocks: Block[]) => string;
  // Remove the blocks (with separators) and, when text is non-null, insert it at
  // the first removed slot — one edit. null = cut (delete), non-null = paste.
  replaceBlocks: (view, indices: number[], text: string | null) => void;
};
```

Single-block drag is just `moveBlocks(view, [i], drop)`.

## State

```ts
// Block anchors (each block's `from`), sorted. Positions — not indices — so they
// survive edits: `update` maps each anchor through `tr.changes` (no filtering).
const blockSelectionField: StateField<readonly number[]>;
const setBlockSelection = StateEffect<readonly number[]>(); // replace
const toggleBlockSelection = StateEffect<number>(); // add/remove one
```

- `getSelectedBlocks(state)` — resolves anchors to `{ block, index }` in order,
  dropping anchors that no longer identify a block start.
- The set is **cleared** on a non-shift `mousedown` in the content (a plain text
  click); keyboard caret moves keep it so it can be extended.

## Feature design

### 1 · Handle only on the active block

`gutter.markers` emits **one** handle (not one per block), at:

- the top-most block in the selection set, if non-empty (feature 4); else
- the block containing `state.selection.main.head`.

Recompute on selection/set change: `lineMarkerChange: u => u.selectionSet ||
hasEffect(u, setBlockSelection, toggleBlock)`.

### 2 · Click handle → toggle the block

The gutter `mousedown` is split arm → move → up:

- **mousedown**: ignore non-primary button; record block + start point; do not
  drag yet.
- **move > 4px**: begin the real drag.
- **mouseup without moving** = click:
  - move the caret to the block start and **collapse** any text selection
    (answer 3);
  - plain: `setBlockSelection([block])`; if it was already the sole selection,
    clear to `[]` (answer 1);
  - `shift`: `toggleBlock(block)` — add/remove, keep the rest (feature 3).

### 4 · Handle on first selected block

Covered by (1)'s priority: with a non-empty set the grip sits on the top-most
selected block, always giving the group a grab point.

### 5 · Drag moves the whole selection

On drag begin: if the grabbed block ∈ set and `|set| > 1`, drag the **set**; else
drag just the grabbed block. `moveBlocks` extracts the selected blocks in document
order, deletes them (with separators), and re-inserts them joined at the drop slot
— they land contiguous there, order preserved, one undo step. The drop index
skips the moving blocks (can't drop inside the group). The floating preview stacks
the selected blocks; the placeholder height is their combined height.

### 6 · Cut / copy / paste

`EditorView.domEventHandlers({ copy, cut, paste })`, active only when the set is
non-empty (else fall through to native text behavior). Mod-C/X/V route through
these same DOM events, so no extra keymap.

- **copy**: `serialize` the set → `clipboardData`; `preventDefault`; keep the set.
- **cut**: copy + `removeBlocks`; clear the set.
- **paste**: `insertBlocks` the clipboard text, **replacing** the selection
  (answer 2); if the set is empty, native paste at the caret.

## Cross-cutting

- **Abort on `docChanged`**: the drag plugin's `update()` cancels an in-flight
  drag when a concurrent/collaborative edit lands (stale indices would otherwise
  resolve against a changed doc on drop).
- **Primary button only** for drag/click.
- **Highlight**: selected blocks get a `cm-block-selected` style (accent-tinted),
  layered like the outline boxes; works with or without `blockOutline`.

## Module layout

- `selection.ts` — `createBlockSelection(ops)`: the field + effects, highlight
  layer, clipboard `domEventHandlers`, and `getSelectedBlocks`. Exports the
  module-level `blockSelectionField` (deduped by CM if included twice).
- `drag.ts` — `createBlockDrag(ops)`: gutter + drag, reads `blockSelectionField`
  for handle placement and multi-block drag; click/shift-click dispatch selection
  effects.
- `blocks.ts` — markdown `BlockOps` (findBlocks, moveBlocks, serialize,
  removeBlocks, insertBlocks); public `blockSelection()`; `blocks()` composes
  outline + selection + drag.
- `outliner/dnd.ts` — outliner `BlockOps` over the item tree.

## Non-goals (this pass)

- Rectangular/column selection, cross-document drag, nested-block reparenting on
  drop (outliner drop keeps the existing re-indent behavior).
