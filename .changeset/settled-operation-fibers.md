---
'@dxos/compute-runtime': patch
---

Invoking an operation no longer keeps its finished process alive for the life of the runtime: once a process settles, only its exit is kept for late `attachFiber` callers, for the 200 most recent processes. `@dxos/react-ui` adds `Util.trimReactPerformanceEntries()`, which stops React's development build from filling the performance timeline with a measure for every re-render.
