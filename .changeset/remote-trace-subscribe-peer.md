---
'@dxos/plugin-client': patch
---

EDGE progress meters (mailbox sync and other remote runs) update and finish again, instead of waiting at 0 until they fail with "Timed out: sync reported no progress". The remote trace subscription sent its peer as a plain object, which the RPC encoder rejects, so the client never subscribed. A failed subscription is now logged rather than dropped silently.
