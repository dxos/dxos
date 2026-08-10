---
'@dxos/compute': patch
'@dxos/operation': patch
'@dxos/plugin-review': patch
---

Operations can declare `dispatch: 'serial'` to guarantee that fire-and-forget invocations (`invokePromise`) apply in the order they were issued. The default (`'concurrent'`) runs each invocation on its own fiber, where a stalled earlier call — for example one paying a lazy handler's chunk load — can be overtaken by a later call, inverting last-write-wins state. Comment thread selection (`CommentOperation.Select`) now uses serial dispatch, fixing a race where clicking a comment could be silently overridden by an earlier, slower selection update.
