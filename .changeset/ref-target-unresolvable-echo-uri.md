---
'@dxos/echo': patch
---

Reading `Ref.target` on a ref whose `echo:` URI names no object (a space-only or malformed URI) now returns `undefined` instead of throwing `Unsupported URI kind`.
