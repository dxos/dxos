---
'@dxos/echo': patch
'@dxos/plugin-markdown': patch
---

Task-set operations now work over MCP (DX-1217). `tasks.list`, `tasks.listMilestone`, and `projects.get` load the set's member refs instead of resolving them synchronously, so a set written in one session no longer reads as empty from another; new `TaskSet.loadTasks`/`loadMilestones` carry that behaviour. `tasks.create` and `tasks.createMilestone` flush the new object before the set references it, so a crash mid-create can no longer leave the set pointing at an object that was never stored — and readers skip any dangling ref left behind. `space.updateObject` converts `{"/": "echo:..."}` ref envelopes at any depth, so ref-array properties can be patched. The project skill's setup instructions call `whoami` instead of the removed `listSpaces`.
