---
'@dxos/react-ui-list': minor
---

Lay every `Tree` row out on one grid the consumer templates: the disclosure toggle is the template's first track (omit it with `toggle={false}` for a flat list), the heading's cells and columns render straight into the row, and each row indents by padding its own grid so nested rows shift as a block. **Breaking:** a `gridTemplateColumns` passed to `Tree` must now begin with the toggle track. The task list builds its template from its options — gutter, status, title, chips, estimate, priority, actions — with every fixed cell one rail-item square and no column gap, and no longer reserves a gutter for a drag handle.
