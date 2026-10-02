---
'@dxos/assistant': patch
---

`AiRequest.runAgentTurn` accepts an `enrichToolCall` hook that annotates streamed tool calls the toolkit cannot attribute to an operation. Code mode uses it to show an `eval` call under the names of the operations its code invokes instead of as `eval`.
