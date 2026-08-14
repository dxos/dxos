---
'@dxos/ai': patch
---

Fix Ollama rejecting the turn after a tool call with HTTP 400 — its `/api/chat` decodes `tool_calls[].function.arguments` into an object, while OpenAI specifies a JSON string, and the request was always encoding the string form.
