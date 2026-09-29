---
'@dxos/echo': patch
---

`MessageChrome` clips a prompt taller than 240px behind a "Show more (N lines)" toggle, so a pasted
console log no longer takes over the assistant thread; the toggle expands it in place.
