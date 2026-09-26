# @dxos/mcp-client

## 0.12.0

### Patch Changes

- 72b7606: The planning skill's `update-tasks` tool now addresses tasks by ref and takes a batch of `changes` that can create, edit, assign or unassign a task, replacing `assign-tasks`; starting or assigning a task puts it on the chat's checklist and makes the conversation's agent its assignee. A new Weather MCP space template exercises this end to end: its task text spells out everything the browser MCP client needs from the Worker it asks for, and the sample exports the `FORECAST_URL` the tool wraps. MCP tools with parameters no longer crash the assistant's turn: each is built as a dynamic tool carrying the server's own JSON Schema, and a connection failure reports the transport's own error. Breaking: the `tasks` input and the `AssignTasks` operation are removed.
- Updated dependencies [8363f12]
- Updated dependencies [a7f4329]
- Updated dependencies [155ca6f]
- Updated dependencies [24cbdff]
- Updated dependencies [c50f666]
- Updated dependencies [a7f4329]
- Updated dependencies [9477170]
- Updated dependencies [0524d38]
- Updated dependencies [3c7b013]
- Updated dependencies [fd873d2]
- Updated dependencies [b2d5bb2]
- Updated dependencies [fd23a8b]
- Updated dependencies [49aee6c]
- Updated dependencies [88e3ebd]
- Updated dependencies [a7f4329]
- Updated dependencies [3e02201]
- Updated dependencies [7b49616]
- Updated dependencies [472ca95]
- Updated dependencies [882ac2a]
- Updated dependencies [4aa6a33]
- Updated dependencies [b1bb838]
- Updated dependencies [9ffccd5]
- Updated dependencies [578b543]
- Updated dependencies [e426625]
- Updated dependencies [3d23fd7]
- Updated dependencies [6dadb41]
  - @dxos/ai@0.12.0
  - @dxos/effect@0.12.0
  - @dxos/log@0.12.0
  - @dxos/invariant@0.12.0

## 0.11.1

### Patch Changes

- @dxos/ai@0.11.1
- @dxos/effect@0.11.1
- @dxos/invariant@0.11.1
- @dxos/keys@0.11.1
- @dxos/log@0.11.1

## 0.11.0

### Patch Changes

- Updated dependencies [6a03a30]
- Updated dependencies [f6a01e3]
- Updated dependencies [bdf9f68]
  - @dxos/keys@0.11.0
  - @dxos/log@0.11.0
  - @dxos/ai@0.11.0
  - @dxos/effect@0.11.0
  - @dxos/invariant@0.11.0
