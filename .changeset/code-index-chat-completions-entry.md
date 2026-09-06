---
'@dxos/echo': minor
---

`@dxos/ai` exposes the chat-completions language-model adapter at its own entry point,
`@dxos/ai/ChatCompletionsAdapter`. The adapter depends on nothing but `effect` and is what speaks
Ollama's and LM Studio's dialects, but until now it was reachable only through the `resolvers`
barrel, which pulls in the DXN-keyed resolver machinery a consumer of the adapter alone has no use
for. No behaviour change for existing consumers of `@dxos/ai/resolvers`.
