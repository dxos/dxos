---
'@dxos/react-ui-list': patch
---

A tree row keyboard focus lands on is painted with the current-item background rather than ringed: a ring inside a row that is already a filled band read as a second, competing highlight. Keyed on `:focus-visible`, so the fill clears when the tree loses focus — the machine's own `data-focus` stays on the tabbable row and would leave one lit.
