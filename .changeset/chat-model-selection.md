---
'@dxos/assistant': minor
---

A chat now carries the model it runs on. `Chat.model` holds the selection as a ref whose URI is the model DXN, and the agent process reads it off the chat it is bound to, recovering it on rehydration the way it already recovers the steering instructions — so the selection survives a remount and travels with the conversation instead of living in the caller that started the turn. `AgentService.getSession` no longer accepts a `model` option, and the `model` option on the service layer and the agent process is now `defaultModel`, applying only to a chat that has not selected one. In Composer, the chat prompt's model picker reads and writes the chat's own selection, and a model the active provider no longer serves is labelled unavailable rather than silently replaced.
