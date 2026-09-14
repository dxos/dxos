---
'@dxos/plugin-markdown': patch
---

A chat's retained model is now resolved through a provider that actually serves it. Model ids are provider-scoped, so a conversation that kept its model selection across a provider change was handed whichever provider the settings named and failed to resolve. The active provider is still used whenever it serves the selected model, which keeps a local model on the sidecar, Ollama or LM Studio instance actually in use.
