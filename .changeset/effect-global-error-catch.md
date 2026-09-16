---
'@dxos/protocols': patch
---

Errors raised from `catch` callbacks are tagged rather than bare `Error`s, so callers can discriminate them; a thrown non-`Error` reaching a service RPC is now wrapped rather than cast, and keeps its message.
