---
'@dxos/echo-client': patch
'@dxos/plugin-client': patch
'@dxos/app-toolkit': patch
---

Fixed the sync progress indicator getting stuck showing "sync in progress" after replication had caught up, and collapsed a space's CRDT and feed backlogs into a single progress item.

- `subscribeToSyncState` now re-establishes the feed sync-state stream after a reconnect (leader change) and clears the feed backlog while it is down — previously the stream died silently and every later document update re-published the last (non-zero) feed counts forever.
- The space replication progress capability no longer stacks a subscription fiber per space on every spaces-subscription delivery (duplicate writers raced over one monitor key), drops the monitor for a space that leaves the list, and reconciles against a fresh `getSyncState` read every 10s so a missed update cannot outlive the backlog.
- Documents and feed blocks now share one monitor per space; the breakdown (`4 CRDTs · ↓6 ↑2`) is rendered as the meter's note, which `ProgressMeter` previously ignored.
