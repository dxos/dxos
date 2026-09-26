---
'@dxos/echo': minor
---

A tab no longer connects to a dedicated worker started by a tab running a different app build, where the two sides could disagree on RPC contracts. Pass `buildId` to `createClientServices` (or `Client.Connection`) and a follower refuses the leader's port when their builds differ. `onWorkerBuildMismatch` (`onBuildMismatch`) is then called on both tabs, so the app can reload the older one.
