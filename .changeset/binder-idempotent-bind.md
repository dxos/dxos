---
'@dxos/assistant': patch
---

`AiContext.Binder.bind` no longer appends a binding for a skill or object the conversation already binds, including a registry skill bound by URI whose target does not resolve locally. Re-binding an unchanged chat context (every companion open) used to grow the chat's feed by one binding per call.
