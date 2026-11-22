---
'@dxos/agent-code-mode': minor
'@dxos/compute': minor
---

`WorkerSandboxWorkerd` is a `WorkerSandbox` spawner for a Cloudflare Worker Loader isolate, as `WorkerSandboxBrowser` is for a Web Worker, so the Effect dialect gets its real bindings on Workers: a deployment bundles `@dxos/agent-code-mode/workerd-worker-entry` and hands it to `WorkerSandboxWorkerd.spawn`. The isolate's ECHO services are limited to its own space (`WorkerHandle.limit`). `WorkerSandbox.Options` gains `refresh` and `workingSet` for services that, like EDGE's, can neither report nor wait for heads, and its `echo` is passed the space it serves.

`Operation.ReplacedByDatabaseAnnotation` marks an operation the database API does entirely; code mode leaves it out. `EFFECT_API` exports the Effect dialect's API reference.
