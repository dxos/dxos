---
'@dxos/mcp-server': minor
---

Let hosts decide when the registry loads: `toolsLayer` serves the fixed tools and resolves the registry per call through the new `RegistrySource` service, and `promptsLayer(registry)` builds prompts from skills alone, so a host can answer `tools/list` without fetching operations. `layer` still composes both eagerly over `Registry.Service`; `promptsLayer` now takes a registry rather than projected skills.
