---
'@dxos/echo': patch
---

A document that stays out of sync with EDGE is resynced again on a backoff (one minute, doubling to ten) instead of waiting for a reconnect, and fragments in the pre-Automerge-3.5 shape that a client receives after its one-time migration are repaired on the next open, so it no longer uploads fragments that hide a document's head from EDGE.
