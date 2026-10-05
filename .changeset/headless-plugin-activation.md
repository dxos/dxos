---
'@dxos/app-toolkit': minor
---

Add `activateHeadlessPlugins` to `@dxos/app-toolkit/testing`, which activates plugins without a UI (as the EDGE operation-service does) and reports activation failures plus the operation keys and schema typenames they contribute. Headless hosts such as workerd no longer activate modules that need an app-only capability: the assistant's question resumer, and the sheet's compute-graph registry and markdown extension, are now node-only.
