---
'@dxos/echo-client': patch
---

Space migrations no longer send `RawString` links as a document's initial value, which the RPC transport rejected. A document creation the transport refuses as invalid now fails once instead of retrying forever, and retried creations back off instead of re-sending every 250 ms.
