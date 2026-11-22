---
'@dxos/agent-code-mode': minor
'@dxos/compute': minor
---

`WorkerSandboxWorkerd` is a `WorkerSandbox` spawner for a Cloudflare Worker Loader isolate, as `WorkerSandboxBrowser` is for a Web Worker, so the Effect dialect gets its real bindings on Workers: a deployment bundles `@dxos/agent-code-mode/workerd-worker-entry` and hands it to `WorkerSandboxWorkerd.spawn`. The isolate's ECHO services are limited to its own space (`WorkerHandle.limit`). `WorkerSandbox.Options` gains `refresh` and `workingSet` for services that, like EDGE's, can neither report nor wait for heads, and its `echo` is passed the space it serves.

`Operation.hiddenInCodeMode` (`HiddenInCodeModeAnnotation`, read with `isHiddenInCodeMode`) hides an operation from code mode while tool callers still see it; plugin-space and plugin-markdown hide the operations the database API does entirely. `EFFECT_API` exports the Effect dialect's API reference.
