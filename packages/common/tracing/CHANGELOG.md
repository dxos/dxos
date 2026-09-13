# @dxos/tracing

## 0.12.0

### Patch Changes

- 882ac2a: The ECHO indexer now reports why it ran.

  Each pass is a single `EchoHost._runIndexPass` span carrying the histogram of requests that triggered it (`documents-saved`, `feed-blocks`, `batch-continuation`, …) plus what the pass did (`updated`, `done`, `invalidates`), and the two `IndexEngine.update` calls nest under it instead of each starting its own root trace.

  The trigger and outcome ride on the span rather than a log line: the only level the OTLP log sink exports is INFO, which is also a level the browser console shows, and at three passes a second that would bury the console it is meant to help.

  Supporting changes:

  - `EffectEx.withContext(ctx)` runs an Effect under a DXOS `Context`: the context's W3C trace identity becomes the effect's parent span, and disposing the context interrupts the fiber. Apply it before `RuntimeProvider.runPromise`/`provide`.
  - `@trace.span({ attributes })` accepts a function of the decorated call's own arguments, and a new `resultAttributes` derives attributes from the return value, attached when it resolves. A fault in either extractor costs the span its attributes and never fails the traced method.
  - `RemoteSpan.setAttributes` lets a backend attach attributes after a span started; buffered spans replay them.

- Updated dependencies [e8088ea]
- Updated dependencies [4da1052]
  - @dxos/util@0.12.0
  - @dxos/node-std@0.12.0
  - @dxos/async@0.12.0
  - @dxos/context@0.12.0
  - @dxos/invariant@0.12.0

## 0.11.1

### Patch Changes

- @dxos/async@0.11.1
- @dxos/context@0.11.1
- @dxos/invariant@0.11.1
- @dxos/log@0.11.1
- @dxos/node-std@0.11.1
- @dxos/protocols@0.11.1
- @dxos/util@0.11.1

## 0.11.0

### Patch Changes

- Updated dependencies [aea1e6e]
- Updated dependencies [3f1fc67]
- Updated dependencies [962c8cd]
- Updated dependencies [f6a01e3]
- Updated dependencies [c727a43]
- Updated dependencies [114fb98]
- Updated dependencies [b591791]
- Updated dependencies [c727a43]
- Updated dependencies [08a3eea]
  - @dxos/async@0.11.0
  - @dxos/util@0.11.0
  - @dxos/protocols@0.11.0
  - @dxos/log@0.11.0
  - @dxos/context@0.11.0
  - @dxos/invariant@0.11.0
  - @dxos/node-std@0.11.0
