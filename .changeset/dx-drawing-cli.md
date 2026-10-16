---
'@dxos/diagram': minor
'@dxos/plugin-illustrator': minor
---

`@dxos/diagram` renders a scene to SVG text without React (`SvgFile.toSvgFile`, `SvgFile.sceneMarkup`), so CLIs and
workers can write diagrams to files; plugin-illustrator's `SceneSvgFile` component is removed in its favor.

The DXOS CLI gains `dx drawing render | import | list | export`, which lay out a `.dx` file, import a `.dx.svg` (including
one that carries only its DSL source) into a space, and export it back out. A laid-out drawing can be converted to an
editable Canvas, tldraw or Excalidraw drawing with the new `Convert` operation and its plank actions. `dx space share`
and other space commands fall back to the first visible space when no default is set, and sharing waits for the space to
be ready.
