---
'@dxos/compute': patch
'@dxos/compute-runtime': patch
'@dxos/edge-compute': patch
'@dxos/plugin-connector': patch
'@dxos/protocols': patch
---

Pressing Sync on an account whose sync routine is switched off now shows a toast that links to the routines panel. Before, it force-ran the trigger on EDGE and retried EDGE's 409 refusal for about 30 seconds, leaving only console warnings. The trigger manager refuses a disabled trigger with a typed `TriggerDisabledError`. EDGE force-runs no longer retry a 409, and `EdgeCallFailedError` now carries the HTTP status.
