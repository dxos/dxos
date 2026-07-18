---
'@dxos/ui-editor': minor
---

Split the `blocks` editor extension into two independent extensions — `blockOutline` (the below-text border boxes) and `blockDrag` (the gutter drag handle + drag-to-reorder). `blocks()` now composes both; use them separately for one behaviour without the other. The drag core (`createBlockDrag`) is generalized over a block provider and reorder function.

Add `outlinerDnd` to reorder outliner task lines via the shared drag core (drag handle, block-height drop placeholder, subtree-aware move with re-indentation).

The drag experience now lifts the source block out of the document (collapsing it and its trailing blank line), opens a block-sized placeholder at the drop slot, centers each grip on its line's first row, and matches the floating preview's wrapping to the source.
