---
'@dxos/plugin-illustrator': patch
---

Register the `Canvas` type on the plugin that owns it, so creating a drawing no longer fails with "Schema not registered" when the Excalidraw plugin is disabled.
