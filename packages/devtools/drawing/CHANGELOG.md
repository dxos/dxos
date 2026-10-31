# @dxos/drawing

## 0.17.0

### Minor Changes

- 0cc622d: Add `drawing open <file.dx | file.dx.svg>`, which uploads the diagram's source and prints a link that opens it as an editable canvas in app.drawing.sh. `drawing render` reads the `.dx` from stdin with `-`, `drawing source` writes to a file with `-o`, and the skill keeps the `.dx` out of the user's project.

### Patch Changes

- 0984c77: The drawing skill runs the CLI from one pinned pkg.pr.new commit instead of the moving `@main`.
- 29b19e7: The drawing skill now lives at the repository root, so `npx skills add dxos/dxos --skill drawing` installs it; it documents installing the `drawing` CLI and putting nodes in groups. A `.dx` group with no members is now dropped with a warning instead of crashing the layout.
- Updated dependencies [82f2242]
- Updated dependencies [1302e04]
- Updated dependencies [7067fec]
- Updated dependencies [bc50a90]
- Updated dependencies [39eb10b]
  - @dxos/diagram@0.17.0
  - @dxos/effect@0.17.0
  - @dxos/errors@0.17.0

## 0.16.0

### Minor Changes

- e8dab41: Publish `@dxos/drawing` to npm: the `drawing` CLI lays out a semantic diagram (`.dx`) into an SVG.

### Patch Changes

- @dxos/diagram@0.16.0
  - @dxos/effect@0.16.0

## 0.15.0

### Patch Changes

- Updated dependencies [647b4bd]
  - @dxos/diagram@0.15.0
  - @dxos/effect@0.15.0
