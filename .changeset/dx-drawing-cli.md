---
'@dxos/diagram': minor
'@dxos/plugin-illustrator': minor
---

`@dxos/diagram` now renders a scene to SVG text without React: `SvgFile.toSvgFile` (and `SvgFile.sceneMarkup`)
produce the same markup plugin-illustrator's `SceneSvg` draws, so headless hosts such as CLIs and workers can
write diagrams to files. plugin-illustrator's `SceneSvgFile` component is gone; use `SvgFile.toSvgFile`.

plugin-illustrator adds `dx drawing render | import | list | export` to the DXOS CLI: lay out a `.dx` file into
a `.dx.svg`, import one into a space as an editable drawing, list a space's drawings, and export one back out.
Importing a `.dx.svg` that carries only its DSL source (as drawing.sh writes) lays the drawing out again from
that source.
