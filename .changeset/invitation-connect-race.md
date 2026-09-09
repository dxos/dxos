---
'@dxos/echo': patch
'@dxos/plugin-markdown': patch
---

Invitations no longer fail when the guest's introduction overtakes the host's own options reply, and a failed feed append backs off instead of spinning the main thread. Space replication recovers from a stalled root-document fetch, and feed handles are dropped when the database's feed service is swapped rather than silently discarding writes.
