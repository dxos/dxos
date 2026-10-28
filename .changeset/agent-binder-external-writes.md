---
'@dxos/assistant': patch
---

`AiContext.noteExternalBindingWrite()` tells a realm's binders that a conversation's bindings may have been written in another process, so the next `Binder.sync()` re-reads them. An EDGE-hosted agent calls it after a tool that binds (e.g. `enable-skills`) runs in operation-service, so the skill's tools appear on the agent's next model call instead of never.
