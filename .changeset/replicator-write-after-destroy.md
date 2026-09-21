---
'@dxos/echo-host': patch
---

Fixed a stream of `invariant violation [!this._destroyed]` errors from the automerge replicator when a peer had more than one teleport session open.

A second session to a peer queues behind the enabled one. If that queued session's extension was destroyed while it was still disabled, nothing retired it, so it stayed in line and was promoted to enabled when the primary session closed — leaving the network adapter writing sync and collection-state messages to a destroyed extension. A queued connection is now retired as soon as its extension closes, a closed connection is never promoted, and a write to an inactive connection is dropped instead of throwing at a fire-and-forget caller.
