---
'@dxos/echo': patch
---

Decoding a ref whose `{ '/': … }` envelope holds a malformed `echo:` URI now fails with `Malformed ECHO URI`, so operation inputs can no longer store a ref that throws on every resolve. `SpaceGraphModel` skips the edge of an already-stored unresolvable ref instead of abandoning the whole graph update.
