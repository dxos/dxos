---
'@dxos/react-ui-components': minor
'@dxos/plugin-search': minor
---

`Timeline`'s `currentBranch` prop is now `branch` (breaking). `Tree` gains a `density` prop that
sizes its rows and disclosure toggles, replacing the `dx-density-*` class a consumer used to pair
with it, and row spacing is a gap on the tree rather than a margin on each row, so the first row
sits flush with the top edge. `Syntax` renders its code as a block and leaves scrolling to
`Syntax.Viewport`: lines now advance by exactly their `line-height`, so an `Nlh` height cap shows
N lines, and the code no longer nests a native scrollbar inside the viewport's own.

The search panel puts its input in a toolbar above the results instead of a status bar below them.
