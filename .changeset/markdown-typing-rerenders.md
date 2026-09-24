---
'@dxos/plugin-markdown': patch
'@dxos/plugin-review': patch
---

Typing in a markdown document no longer re-renders the editor article, the Properties panel or the Comments panel on every keystroke. A document whose first line is a single word longer than 32 characters now gets that word, truncated, as its fallback title instead of `…`.
