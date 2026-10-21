---
'@dxos/assistant': patch
'@dxos/ai': patch
---

An assistant turn no longer ends silently after its reasoning when the model calls a tool the toolkit lacks, or calls one with parameters it rejects. The stream decodes tool calls with deferred validation, so the call reaches the loop and the model gets a tool error to recover from; strict decoding dropped the whole batch of parts the call arrived in. The scripted model can emit the provider's closing `tool-call` part (`emitToolCalls`) to cover this shape.
