---
'@dxos/ai': patch
---

The chat-completions adapter now fails `generateText` when the provider rejects the request. Before, the error body was read as an empty reply and the turn ended with no output. The provider's message is kept on the error. A tool call Ollama cannot parse (gpt-oss writes its arguments as a JavaScript object literal) is reported as `InvalidOutputError`, so callers can treat it as the model's mistake and retry.
