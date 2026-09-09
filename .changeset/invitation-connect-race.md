---
'@dxos/echo': patch
'@dxos/plugin-markdown': patch
---

Invitations no longer fail when the guest's introduction overtakes the host's own options reply, and a failed feed append backs off instead of spinning the main thread. Space replication now re-opens a sync round that settled without delivering, so a stalled root document or a pair of documents whose heads stay diverged recovers instead of parking forever, and `flush()` no longer reports success while a feed handle retired by a service swap is still draining.
