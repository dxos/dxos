---
'@dxos/plugin-assistant': patch
---

Fixed a momentary "Cannot read properties of null" error flash when opening the assistant companion. The companion renders blank while its chat is being provisioned instead of throwing into the error boundary.
