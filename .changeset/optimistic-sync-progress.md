---
'@dxos/compute-runtime': patch
---

A connector sync shows as running from the moment it is fired and stays visible across continuation batches until the backfill completes. The swarm remote trace monitor resubscribes with backoff after a transport failure instead of ending.
