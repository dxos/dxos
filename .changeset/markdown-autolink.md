---
'@dxos/ui-editor': patch
---

Render bare (`https://…`) and angle-bracket (`<https://…>`) autolinks as anchors in markdown. The GFM parser already produced the nodes, but `decorateMarkdown` only decorated the bracketed `[label](url)` form, so a naked URL stayed plain text.
