---
'@dxos/react-ui-list': minor
---

`TaskList` renders its hierarchical mode as a `Tree`, so disclosure, roving focus and the WAI-ARIA
keymap come from the tree machine rather than from hand-maintained `aria-level`/`posinset`/`setsize`
on listbox options; the flat and grouped modes are unchanged. Task priority becomes a control — a
signal-strength glyph on every row that opens a menu to set the level. `Tree` gains an optional
`renderHeading` slot for rows that lead with their own controls instead of a label. Fixes the
accordion's open/close animation, which had stopped moving because its keyframes targeted a
Radix-only CSS variable.
