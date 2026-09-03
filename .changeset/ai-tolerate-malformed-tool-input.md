---
'@dxos/ai': patch
---

A tool call whose input the model emitted as invalid JSON no longer fails the request. `AiPreprocessor` previously raised on such a block, and because the block stays in the durable message history that made every subsequent request over the conversation fail too — one malformed tool call bricked the chat. The raw string is now passed through as the call's params, so the model sees what it wrote, alongside the tool-result error `callTool` already returns telling it to retry.
