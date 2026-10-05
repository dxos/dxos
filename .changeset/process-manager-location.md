---
'@dxos/compute-runtime': patch
---

`RemoteProcessHandle` retries a failed event read with backoff instead of ending the subscription, so one dropped request no longer stops a remote process's outputs from reaching its subscribers.
