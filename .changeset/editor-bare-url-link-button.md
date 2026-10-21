---
'@dxos/ui-editor': patch
---

Bare URLs and `<url>` autolinks in the markdown editor show the link button (`decorateMarkdown`'s `renderLinkButton`) after them, as `[label](url)` links do; it hides while the cursor is inside the URL.
