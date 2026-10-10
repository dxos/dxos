---
'@dxos/compute': patch
'@dxos/compute-runtime': patch
'@dxos/edge-compute': patch
'@dxos/plugin-connector': patch
'@dxos/plugin-routine': patch
---

Switching a routine's action between Instructions and an operation no longer carries one kind's trigger inputs into the other: a stray `input: {}` (or an operation's `connection`) failed every run until EDGE switched the trigger off. Switching a broken trigger back on now repairs it. Pressing Sync on an account whose sync routine is switched off now shows a toast that links to the routines panel, instead of retrying EDGE's 409 refusal for about 30 seconds. The trigger manager refuses a disabled trigger with a typed `TriggerDisabledError`, and EDGE force-runs no longer retry a 409 that is not about the trigger being switched off.
