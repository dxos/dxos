---
'@dxos/echo-client': patch
---

New documents now reach the host as Automerge bytes in `DataService.createDocument`'s new `initialDocument` field, so initial values holding `RawString` links or bytes are no longer rejected by the RPC transport. The JSON `initialValue` field is deprecated and logs a warning when a host receives it. A creation the transport refuses as invalid now fails once instead of retrying forever, and retried creations back off instead of re-sending every 250 ms.
