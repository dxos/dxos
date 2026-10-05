---
'@dxos/plugin-assistant': patch
'@dxos/plugin-map': patch
'@dxos/plugin-observability': patch
---

Plugin state no longer shares a localStorage key with plugin settings, so changing a setting no longer wipes state on the next reload, and saving state no longer wipes settings. Assistant keeps each object's current chat, Maps keeps the globe/map choice and API keys, and the telemetry toggle stays off after an opt-out. State moves to `<plugin id>.state`; the old values are not migrated.
