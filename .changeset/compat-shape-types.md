---
'@dxos/protocols': minor
'@dxos/echo-host': patch
---

Add `Compat<T>` to `@dxos/protocols/buf-shape-compat`, deriving the protobuf.js-shaped view of a buf message from its generated type so compat-codec call sites no longer import the protobuf.js generated barrel to name a type.
