# Outliner rebuilt on `blocks` — DESIGN

## Motivation

`blocks` (`../blocks`) is the precise, tested foundation for the gutter drag grip,
whole-block selection, the selection highlight, and block clipboard. The outliner
predates it and still carries its **own** selection (`selection.ts`,
`selectionFacet`), drag wiring (`outlinerDnd`), and selection decorations
(`outliner.ts` `decorations()`). Those now duplicate and fight `blocks`:

- **Two disconnected selection models** — `selectionFacet` (item indices; keyboard
  commands; `.cm-list-item` border) vs `blockSelectionField` (anchors; grip
  click/drag; `RectangleMarker` highlight). They never sync, so grip selection and
  keyboard selection are invisible to each other, and `Cmd+A` then `Cmd+C` copies
  nothing (clipboard reads the empty block selection).
- **Redundant, misaligned highlight** — `outlinerDnd` layers
  `createBlockSelectionHighlight` on top of the outliner's own border with different
  geometry → the highlight sits off the row.
- **Grip above the checkbox** — the grip anchors to the line-block top, but the
  outliner row adds `paddingTop`/`marginTop`, pushing the checkbox down ~6px.

**Plan:** rebuild the outliner as _structure + editing on top of `blocks`_.
`blocks` owns selection, drag, highlight, and clipboard; the outliner keeps only
what is genuinely hierarchy/markdown-specific.

## Goals

- One selection model: `blockSelectionField`.
- The grip centers on the checkbox.
- Selecting or dragging an item covers its **whole subtree**.
- A **subtle** current-item (caret) indicator, distinct from the accent selection.
- Preserve outliner structure/editing: tree parsing, edit constraints, commands, menu.

## Non-goals

- Rewriting `tree.ts` parsing or the `editor.ts` edit constraints.
- Cross-document drag, virtualization, multi-select rectangle.

## Block model (the crux)

Subtree-as-block and per-item grips pull in opposite directions: subtree ranges
**overlap** (a parent contains its children), but the gutter/drag ordering needs
**non-overlapping** ranges. Resolve by separating the two:

- **`getBlocks`** (gutter grips + drag ordering) = each item's **own lines**,
  non-overlapping, one grip per item.
  `from = item.lineRange.from`; `to = firstChild ? firstChild.lineRange.from − 1 : item.lineRange.to`.
- **Block extent** (selection highlight, drag collapse/preview, clipboard) = the
  item's **subtree**: `getRange(tree, item) = [item.lineRange.from, lastDescendant.lineRange.to]`.
  Overlap between a selected parent and a selected child is acceptable — the
  highlight just draws overlapping boxes.

### `blocks` change: extent hook

Add an optional `getBlockExtent(state, block) => { from, to }` to the `blocks`
core, defaulting to the block's own range. It is consulted by:

- `createBlockSelectionHighlight` — the marker for a selected block spans its extent.
- `createBlockDrag` — the collapse decoration, floating preview, and placeholder
  size use the extent (so dragging a parent visually moves the whole subtree).

Markdown blocks pass no hook (extent = own range, unchanged). The outliner passes
the subtree mapper. This keeps `blocks` generic and leaves markdown behavior
byte-for-byte identical.

## Drag reindent — drop level rules

Dragging an item moves its whole subtree (`getExtent`). On drop the subtree is
**re-indented** to a target level; the drag preview shows that level live so the
drop is predictable. The subtlety is at a **branch boundary** — dropping into the
gap before an item that is _shallower_ than the item above the gap. Example:

```
- A
  - B
  - C
- D
```

Dropping `B` into the gap between `C` and `D` is ambiguous:

- **(i)** `B` stays a child of `A` (a sibling of `C`), or
- **(ii)** `B` becomes a sibling of `A` (aligned with `D`).

### Rule

For a drop into the slot before `target` (the item at the drop index), let
`above` be the last item before the slot that is not part of the dragged subtree,
and `unit = getIndentUnit`. Working in leading-space counts:

- `min = indent(target)` — shallowest: a sibling of `target` (leave the branch).
- `max = indent(above) + unit` — deepest: a child of `above`.
- **default (i)** `stay = clamp(indent(source), min, max)` — the dragged item keeps
  its **own** level (staying in its branch), clamped so it is at most a child of
  `above` and at least a sibling of `target`.
- **(ii)** applies only at a real branch boundary (`min < stay`) **and** only while
  the pointer is vertically **over the `target` row** (`pointerY ≥ target.top`);
  then the level drops to `min` (a sibling of `target`).

So the default is always (i) — the dragged item keeps its place in the current
branch — and it outdents to (ii) only when the pointer moves down onto the
shallower next item (`D`). At the end of the document, or with no `target`, the
level stays at `above`'s branch.

### Preview + wiring

`blocks/drag.ts` stays hierarchy-agnostic. The outliner supplies an optional
`getDropIndent(view, sourceIndices, dropIndex, pointerY)` hook returning
`{ indent, offset }` — the target leading-space count and the horizontal pixel
offset for the preview (`(indent − sourceIndent) / unit × bulletListIndentationWidth`).
The drag plugin shifts the floating preview by `offset` each pointer move and, on
drop, passes `indent` to `moveBlocks` so the committed re-indent matches the
preview. Markdown blocks pass no hook (no reindent, preview unshifted).

## Selection (single model)

- `blockSelectionField` is the only selection state.
- Grip click / shift-click / drag populate it (unchanged `blocks` behavior).
- Outliner `selectAll` / `selectUp` / `selectDown` are retargeted to
  `blockSelectionField` (tree traversal → block anchors), replacing the
  `selectionFacet` versions. `selectUp`/`selectDown` (today no-op stubs) get real
  implementations: extend the block selection to the previous/next item.
- Clipboard (cut/copy/paste) via `createBlockSelection` with the outliner
  `BlockOps` (subtree-aware `serialize`/`replaceBlocks`).
- **Remove** `selection.ts` (`selectionFacet`, `selectionCompartment`,
  `selectAll/None/Up/Down`) and the selection branch of `outliner.ts`
  `decorations()`.

## Current-item indicator

- A subtle border on the caret item's **subtree extent**, visually distinct from
  the accent selection highlight (e.g. `--color-focus-ring-subtle`).
- Rendered by a minimal outliner layer/decoration driven by `tree.find(caretPos)`
  → subtree extent. This is the one piece of the old `decorations()` we keep, but
  scoped to the current item only (no selection role).

## Grip ↔ checkbox alignment

Generalize in `blocks` (per the decision), kept cheap:

- The grip currently top-anchors and sizes to the first row height. Offset it down
  by the first line's rendered top padding so it centers on the row content.
- Preferred: derive the offset without per-frame layout reads (no `coordsAtPos`
  during update). If a clean generic measurement proves costly, fall back to a
  `gripInsetTop?: number` option on `createBlockDrag` that the outliner sets to its
  known row padding. Decide during implementation; do not regress markdown
  centering (heading vs body).

## Module changes

| Module                                  | Action                                                                                                                                                              |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tree.ts`                               | keep                                                                                                                                                                |
| `editor.ts`                             | keep (constraints + `initialize`; add teardown for the `setTimeout` in `initialize`)                                                                                |
| `commands.ts`                           | keep; retarget select commands to `blockSelectionField`                                                                                                             |
| `menu.ts`                               | keep                                                                                                                                                                |
| `dnd.ts`                                | keep the `BlockOps` adapter (subtree move + reindent, serialize, replace); add the subtree `getBlockExtent`; **drop** the `outlinerDnd` highlight/selection wrapper |
| `selection.ts`                          | **remove**                                                                                                                                                          |
| `outliner.ts`                           | compose `blocks()` (drag + selection + highlight + clipboard) + tree + editor + commands + menu + current-item indicator; **drop** the selection decorations        |
| `blocks/drag.ts`, `blocks/selection.ts` | add `getBlockExtent` hook; generalize grip alignment                                                                                                                |

### Incidental cleanups (in scope)

- Dead theme tokens in `drag.ts`: `--dx-description`, `--dx-base-surface` → real
  `--color-*` tokens (or drop the fallback).
- `editor.ts` `initialize()` `setTimeout` — guard against dispatch on a destroyed view.

## Risks / open questions

- Overlapping subtree highlights when a parent and descendant are both selected —
  accepted as visually fine; confirm on review.
- Grip-alignment generalization must not add a per-line layout read on the hot path.
- Interaction of `editor.ts` edit constraints with subtree moves (re-indent) —
  covered by existing move logic but needs a test.

## Test plan

- Reuse `tree.test.ts`, `editor.test.ts`, `outliner.test.ts`.
- Add headless tests: subtree `getBlockExtent`; `selectAll/Up/Down` populate
  `blockSelectionField`; clipboard cut/copy/paste over a subtree; single-item drag
  relocates the subtree and keeps it selected.
- Storybook (`Outliner.stories.tsx`): grip centered on the checkbox; selecting an
  item highlights its subtree; current-item border distinct from selection.
