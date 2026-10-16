---
'@dxos/plugin-illustrator': minor
---

Add `dx drawing` to the CLI: `render` lays out a semantic-DSL `.dx` file into a `.dx.svg` and prints the layout report, `import` adds a `.dx.svg` to a space as an editable drawing, `list` lists a space's drawings, and `export` writes one back out. The standalone SVG export (`toSvgFile`) is now a React-free string renderer in the model, byte-identical to the previous output, so headless hosts can render drawings.
