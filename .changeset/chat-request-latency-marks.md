---
'@dxos/util': minor
'@dxos/plugin-assistant': patch
---

Cut the wait between submitting a chat prompt and the model request by 22–39% and between agent turns by 40–48%, and add `markWork`, `dxos:`-prefixed User Timing marks that a perf harness joins across realms over CDP and DevTools shows on its Timings track, with `ai.request` / `ai.response` marked around every `@dxos/ai` model call.
