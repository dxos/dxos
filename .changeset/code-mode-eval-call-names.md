---
'@dxos/types': patch
'@dxos/react-ui-assistant': patch
---

`ContentBlock.ToolCall` gains presentational `displayName` and `displayIcon` fields, which the assistant's tool row prefers over the operation name and icon. Code mode sets them on each `eval` call from the operations its code invokes, so the call shows as e.g. "Create task" instead of `eval`.
