---
'@dxos/protocols': patch
---

Fix corruption of large query results containing emoji or other astral characters. The `QueryService` RPC now encodes its payloads with Effect schemas instead of protobuf, avoiding a `@protobufjs/utf8` bug that injected a lone surrogate into string fields larger than 8KB and broke object hydration.
