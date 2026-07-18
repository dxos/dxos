---
'@dxos/ui-editor': minor
---

Split the `blocks` editor extension into `blockOutline` (the below-text border boxes — usable on its own), `blockSelection` (whole-block selection state, highlight, and clipboard), and `blockDrag` (the gutter grip that drives selection and drag-to-reorder). `blocks()` composes all three; `blockOutline` stands alone, while `blockSelection` and `blockDrag` are a pair (the grip lives in `blockDrag`). The drag core (`createBlockDrag`) and selection core (`createBlockSelection`) are generalized over a document-agnostic `BlockOps` contract, shared by markdown blocks and the outliner.

Add document-agnostic whole-block selection: the gutter shows a grip on the caret's block and each selected block; clicking a grip selects the block (shift-click toggles it in a multi-selection). Dragging a grip reorders the block, or the whole selection when it is part of it, and `Cut`/`Copy`/`Paste` operate on the selected blocks. Wire the same selection, drag, and clipboard into the outliner (`outlinerDnd`).

The drag experience lifts the source block(s) out of the document (collapsing them and their trailing blank line), opens a block-sized placeholder at the drop slot, centers each grip on its line's first row, and matches the floating preview's wrapping to the source. Drags abort on a concurrent edit and start on the primary button only.
