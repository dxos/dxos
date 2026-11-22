---
'@dxos/agent-code-mode': minor
---

`WorkerdEchoSandbox` runs the model's code in a Worker Loader isolate against its own ECHO client, so the Effect dialect gets its real bindings on Cloudflare Workers as it does in Composer's Web Worker. It is `WorkerSandbox` with the thread swapped for an isolate: the same runtime and protocol, carried over Workers RPC (`WorkerdBridge`), with the code compiled into a program module because workerd has no `eval`. The isolate's ECHO services are limited to the evaluation's space. A deployment bundles `@dxos/agent-code-mode/workerd-echo-runtime` for workerd and hands it to the sandbox as its runtime.

`WorkerSandbox.Options.echo` is passed the space it serves, and `refresh` hands writes over by flushing and refreshing the host's documents, for services that can neither report nor wait for heads (EDGE's). `EFFECT_API` exports the Effect dialect's API reference.
