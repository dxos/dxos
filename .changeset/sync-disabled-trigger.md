---
'@dxos/compute': patch
'@dxos/compute-runtime': patch
'@dxos/edge-compute': patch
'@dxos/plugin-connector': patch
'@dxos/plugin-routine': patch
---

Switching a routine's action to Instructions and back no longer leaves an `input: {}` on its trigger. The stray key failed every run of the operation until EDGE switched the trigger off. Pressing Sync on an account whose sync routine is switched off now shows a toast that links to the routines panel, instead of retrying EDGE's 409 refusal for about 30 seconds. The trigger manager refuses a disabled trigger with a typed `TriggerDisabledError`. EDGE force-runs no longer retry a 409.
