---
'@dxos/worker-framework': patch
---

A dedicated worker displaced by a newer worker before it became ready now tells its leader (`displaced`), so the leader re-elects and spawns a fresh worker within its retry backoff instead of waiting out the 15s handshake timeout, which had used up the tab's whole boot budget.
