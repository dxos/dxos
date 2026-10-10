---
'@dxos/compute-runtime': patch
'@dxos/edge-compute': patch
'@dxos/app-framework': patch
'@dxos/plugin-routine': patch
---

An operation invoked with `on: 'edge'` now runs as one request to EDGE's operation host (`POST /functions/dxn:<key>`) instead of spawning a process there, so a call such as the Brain panel's `InspectBrain` poll no longer creates a Durable Object per invocation. `RemoteOperationInvoker.invoke` takes the space per call and carries input and output in their wire form, which the invoker encodes and decodes with the operation's schemas. `@dxos/plugin-routine` provides the EDGE invoker once for the application instead of per space, and `EdgeOperationInvoker` presents the current identity on every call.
