---
'@dxos/app-graph': patch
---

Re-running a graph builder whose actions did not change no longer emits a node change per action: rebuilt action closures and label tuples now compare as unchanged, and invoking an action still runs its latest closure.
