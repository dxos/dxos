# @dxos/react-ui-canvas-editor

## 0.17.0

### Minor Changes

- 10a11da: A canvas selection can be restacked — `Bring to front` / `Send to back` in the right-click menu and on ⌘] / ⌘[ — and a layer now paints its nodes and links in one order by `z`, so a shape drawn over a link covers it and a link drawn over a shape crosses it, matching what the Views list shows and what a click selects. The selection is no longer raised above its neighbours.

  A 2D layout carries a `grid` pitch, which the new `Drawing` inspector section edits along with the lattice, and `DEFAULT_GRID` is 12 (major cell 48). Every default and fixture geometry that was written in 64px cells — shape sizes, layout pitches, the compute shapes and circuits, the `.dx` exemplars — is now expressed in major cells, so it holds whatever the drawing's grid is. ⌘' toggles the background grid, and shape text is 20px.

### Patch Changes

- Updated dependencies [90a7f6e]
- Updated dependencies [c1f845f]
- Updated dependencies [cb058b9]
- Updated dependencies [5ee83e7]
- Updated dependencies [c1c6cf4]
- Updated dependencies [82f2242]
- Updated dependencies [a5742a9]
- Updated dependencies [cab57d0]
- Updated dependencies [a349ae0]
- Updated dependencies [df16fba]
- Updated dependencies [40271d5]
- Updated dependencies [e82b80a]
- Updated dependencies [9b2b0fe]
- Updated dependencies [10a11da]
- Updated dependencies [e8029c3]
- Updated dependencies [81d2cd2]
- Updated dependencies [d8b13ad]
- Updated dependencies [1924a44]
- Updated dependencies [b97d8ea]
- Updated dependencies [e343467]
- Updated dependencies [9a3313a]
- Updated dependencies [034e231]
- Updated dependencies [0590c11]
- Updated dependencies [9fe0e5c]
- Updated dependencies [1302e04]
- Updated dependencies [7067fec]
- Updated dependencies [bc50a90]
- Updated dependencies [39eb10b]
- Updated dependencies [94df7d2]
- Updated dependencies [aec19dd]
- Updated dependencies [a70fb5a]
- Updated dependencies [f7e965a]
- Updated dependencies [9bcc167]
- Updated dependencies [908c301]
- Updated dependencies [416201f]
- Updated dependencies [df1380a]
- Updated dependencies [13bc40d]
- Updated dependencies [a1c19cc]
- Updated dependencies [7751052]
- Updated dependencies [545ee73]
- Updated dependencies [9d66bcd]
- Updated dependencies [6030742]
- Updated dependencies [074e3e6]
- Updated dependencies [17a9e75]
- Updated dependencies [b46d89b]
- Updated dependencies [853663c]
- Updated dependencies [1f73ed2]
- Updated dependencies [691fe84]
- Updated dependencies [0166448]
- Updated dependencies [f86f10e]
- Updated dependencies [80818bc]
- Updated dependencies [8554a26]
- Updated dependencies [b8cc7e7]
- Updated dependencies [e99e717]
- Updated dependencies [bc5cea7]
- Updated dependencies [aa1cde1]
- Updated dependencies [4fe25ee]
- Updated dependencies [2cebedc]
- Updated dependencies [7da5d17]
- Updated dependencies [f299590]
- Updated dependencies [ca2a4a8]
- Updated dependencies [7e07e49]
- Updated dependencies [b159f41]
- Updated dependencies [8a66e4e]
- Updated dependencies [d00cc85]
- Updated dependencies [10b3963]
- Updated dependencies [1a0fff1]
- Updated dependencies [901c1e4]
- Updated dependencies [c1c6cf4]
- Updated dependencies [6f27147]
- Updated dependencies [e67aa80]
- Updated dependencies [df65316]
  - @dxos/echo@0.17.0
  - @dxos/react-ui@0.17.0
  - @dxos/ui-types@0.17.0
  - @dxos/react-ui-canvas@0.17.0
  - @dxos/diagram@0.17.0
  - @dxos/scene@0.17.0
  - @dxos/react-ui-form@0.17.0
  - @dxos/react-ui-list@0.17.0
  - @dxos/animation@0.17.0
  - @dxos/react-ui-animation@0.17.0
  - @dxos/ui-theme@0.17.0
  - @dxos/react-hooks@0.17.0
