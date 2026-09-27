---
'@dxos/plugin-assistant': patch
---

Choosing a chat from the companion's Chat History now shows that chat. The companion resolved the chosen chat's `echo://` URI as a DXN, which rejected it, and then filtered out the snapshot its atom returned, so it kept showing the previous chat. The Load Plugin dialog in `@dxos/plugin-registry` now also shows why an import failed (for example `Invalid DXN` for a hyphenated plugin key), not just the failing stage.
