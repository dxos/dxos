---
'@dxos/react-ui-list': minor
'@dxos/plugin-navtree': patch
---

`Tree` rows treat cursor, selection and collapse as one gesture each.

The pointer now belongs to rows a click selects, rather than to every row: a row that can only be
dragged takes the open hand, and a draggable row shows `grabbing` for the press that starts the
drag. Selection no longer discloses — a branch that `canSelect` refuses discloses on click (it
previously did nothing), and a selectable one only ever selects, with the chevron, `Space` and
option-click still disclosing either way.

A selected row could not be re-selected: the row reported the flip of its own state, deselecting it,
and the machine selected it again on the same click. Re-activation now reports the row as staying
current, matching `Enter`, and `selectNode`'s `current` argument is required — the flipping default
also read a machine event for an already-current row as a deselect. Single selection still has no
deselect-by-click gesture.

A collapse commits on the gesture instead of waiting out its animation, and the conceal rides the
machine's own `data-state`. The chevron, the model and the machine no longer disagree for the
length of the animation, and a click arriving mid-collapse reopens the branch rather than being
swallowed.

In the navtree, a graph node with no data is reported as unselectable, matching the select handler,
which already ignored it: synthetic sections such as the Collections row now disclose on click and
offer no pointer.
