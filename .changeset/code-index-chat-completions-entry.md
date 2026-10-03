---
'@dxos/echo': minor
---

`@dxos/ai` exposes the chat-completions language-model adapter at its own entry point,
`@dxos/ai/chat-completions`. The adapter depends on nothing but `effect` and is what speaks
Ollama's and LM Studio's dialects, but until now it was reachable only through the `resolvers`
barrel, which pulls in the DXN-keyed resolver machinery a consumer of the adapter alone has no use
for. No behaviour change for existing consumers of `@dxos/ai/resolvers`.

The subpath is kebab-case on purpose: `dxos-subpath-exports` engages as soon as a package declares
one PascalCase subpath, and it would then report every namespace in this package's unmigrated root
barrel — flagging the migration rather than a defect.
