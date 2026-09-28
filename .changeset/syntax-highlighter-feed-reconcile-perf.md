---
'@dxos/echo': patch
---

`SyntaxHighlighter` no longer re-tokenizes unchanged source on every parent render and builds its token elements without rescanning the whole stylesheet per token, and a feed re-read skips decoding and digesting objects whose block has already been applied.
