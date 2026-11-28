---
'@dxos/app-graph': patch
---

Stop re-applying an action connector's output to the graph when a re-run only rebuilt its actions' invoke closures; the stored action now runs the latest closure without re-offering the relation's nodes.
