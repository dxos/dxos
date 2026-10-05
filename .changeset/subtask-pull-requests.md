---
'@dxos/types': minor
'@dxos/plugin-tasks': patch
---

A pull request now stays on the task it is attached to, so a sub-task fixed on its own can carry its own PR alongside its parent's; only a second, different open PR on the same task is refused. `Task.artifactTarget` is replaced by `Task.checkArtifact`, which validates without redirecting.
