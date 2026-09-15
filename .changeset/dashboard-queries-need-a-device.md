---
'@dxos/plugin-space': patch
---

The space dashboard no longer queries every object in the active space unless a peripheral needs it. Stream Deck reads it only while its bridge is connected, and LaMetric only while a device is configured.
