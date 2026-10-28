---
'@dxos/assistant': patch
---

`Binder.sync()` after `AiContext.noteExternalBindingWrite()` now waits (up to 5s) for the bindings query to return the new binding, so on EDGE, where a feed append is indexed asynchronously, a skill the agent enables shows its tools on the agent's next model call.
