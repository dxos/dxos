---
'@dxos/echo': minor
'@dxos/plugin-markdown': patch
---

Add `tags` to operation metadata and filter the trace panel by them. Operation definitions carry a coarse classification (`Operation.Tag`), the tags are recorded on operation trace events, and the trace panel now shows a filter that hides interface, editing, and query chatter by default.
