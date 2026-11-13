---
'@dxos/plugin-presenter': minor
---

Slide markdown takes three style tags: `<List variant="cards|steps|outline">`, `<Table variant="rows|cards|outline">` and `<Box variant="card|outline">`. `List` and `Table` style the block they wrap rather than adding an element, so the content stays a plain markdown list or GFM table while the slide theme paints it; `Box` is the generic container and wraps whatever it holds. Variants are defined in one place in the slide theme, keyed by the part each class lands on. An unknown variant falls back to the plain block and is reported as a slide issue, as is a `<List>`/`<Table>` that wraps nothing to style.
