# @dxos/scene

## 0.17.0

### Minor Changes

- 10a11da: A canvas selection can be restacked — `Bring to front` / `Send to back` in the right-click menu and on ⌘] / ⌘[ — and a layer now paints its nodes and links in one order by `z`, so a shape drawn over a link covers it and a link drawn over a shape crosses it, matching what the Views list shows and what a click selects. The selection is no longer raised above its neighbours.

  A 2D layout carries a `grid` pitch, which the new `Drawing` inspector section edits along with the lattice, and `DEFAULT_GRID` is 12 (major cell 48). Every default and fixture geometry that was written in 64px cells — shape sizes, layout pitches, the compute shapes and circuits, the `.dx` exemplars — is now expressed in major cells, so it holds whatever the drawing's grid is. ⌘' toggles the background grid, and shape text is 20px.

### Patch Changes

- a349ae0: A drawing's `grid` pitch must be at least one: snapping divides by it, so a layout patch storing zero or a
  negative pitch would have put every drop and nudge at `NaN`. A restack also keeps an element whose id is
  `__proto__`, which an object literal would have dropped from the edit.
- Updated dependencies [90a7f6e]
- Updated dependencies [c1f845f]
- Updated dependencies [cb058b9]
- Updated dependencies [d8b13ad]
- Updated dependencies [1924a44]
- Updated dependencies [0590c11]
- Updated dependencies [9fe0e5c]
- Updated dependencies [aec19dd]
- Updated dependencies [a70fb5a]
- Updated dependencies [f7e965a]
- Updated dependencies [9bcc167]
- Updated dependencies [908c301]
- Updated dependencies [7751052]
- Updated dependencies [545ee73]
- Updated dependencies [074e3e6]
- Updated dependencies [b46d89b]
- Updated dependencies [853663c]
- Updated dependencies [1f73ed2]
- Updated dependencies [691fe84]
- Updated dependencies [b8cc7e7]
- Updated dependencies [e99e717]
- Updated dependencies [bc5cea7]
- Updated dependencies [aa1cde1]
- Updated dependencies [2cebedc]
- Updated dependencies [f299590]
- Updated dependencies [b159f41]
- Updated dependencies [8a66e4e]
- Updated dependencies [1a0fff1]
- Updated dependencies [901c1e4]
- Updated dependencies [df65316]
  - @dxos/echo@0.17.0
  - @dxos/ui-types@0.17.0
  - @dxos/animation@0.17.0
