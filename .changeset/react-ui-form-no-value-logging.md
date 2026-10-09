---
'@dxos/react-ui-form': patch
---

Stop writing form field values to the debug log, so secrets typed into forms (passwords, API keys, access tokens) no longer reach `app.log` or exported log bundles.
