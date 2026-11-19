---
'@dxos/worker-framework': patch
---

Two tabs on different app builds no longer kill each other's worker every port timeout. A tab whose leader lock is stolen twice by a tab it cannot reach over its coordinator stops stealing it back and calls `onPersistentFailure` with the new `WorkerLeaderContentionError`, so the app can reload every tab onto one build.
