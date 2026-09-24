---
'@dxos/worker-framework': patch
'@dxos/plugin-space': patch
---

Report worker and client startup failures instead of hanging: leader sessions that close or time out release their worker, a worker runtime that fails to start rejects the connection, `ClientProvider` throws initialization errors to the error boundary, an RPC handler defect fails only its own request, and a failed space initialization settles `createSpace` and `waitUntilReady`.
