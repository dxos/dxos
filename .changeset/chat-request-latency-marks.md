---
'@dxos/util': minor
'@dxos/plugin-assistant': patch
---

Cut the wait between submitting a chat prompt and the model request by 22–39% and between agent turns by 40–48%, and add `markWork`, cross-realm latency marks a perf harness joins over CDP, with `ai.request` / `ai.response` marked around every `@dxos/ai` model call.
