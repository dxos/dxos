---
'@dxos/echo-host': patch
'@dxos/tracing': patch
'@dxos/effect': patch
---

The ECHO indexer now reports why it ran.

Each pass is a single `EchoHost._runIndexPass` span carrying the histogram of requests that triggered it (`documents-saved`, `feed-blocks`, `batch-continuation`, …), and the two `IndexEngine.update` calls nest under it instead of each starting its own root trace. `indexEngine update completed` moved from `verbose` to `info` so it clears the OTLP log sink's INFO floor and the trigger histogram is readable from the field rather than only from a local `app.log`.

Supporting changes:

- `EffectEx.withContext(ctx)` runs an Effect under a DXOS `Context`: the context's W3C trace identity becomes the effect's parent span, and disposing the context interrupts the fiber. Apply it before `RuntimeProvider.runPromise`/`provide`.
- `@trace.span({ attributes })` accepts a function of the decorated call's own arguments, for a value only known per call.
