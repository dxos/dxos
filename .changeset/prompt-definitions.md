---
'@dxos/assistant': minor
---

Tool parameters that reference objects now keep their own description, and the object reference format is stated once in a `## Definitions` section of the system prompt instead of in every reference parameter, which roughly halves the size of an agent's model request. Modules declare such shared sections with `PromptDefinition` from `@dxos/ai`, and callers can add their own through `definitions` on `AiRequest.run` and `AiSession`.
