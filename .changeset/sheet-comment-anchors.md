---
'@dxos/app-toolkit': minor
'@dxos/plugin-sheet': patch
---

Comments on sheet cells stay on their cells when rows and columns are inserted, deleted or moved: the anchor names the cells by row and column id, and selecting a commented cell or a thread now finds the other. Anchors stored in A1 or `col,row` form are still read, by position. `CommentConfig.anchorFromSelection` lets a plugin build the comment anchor from its selection.
