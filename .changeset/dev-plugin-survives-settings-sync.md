---
'@dxos/plugin-space': patch
---

A plugin loaded through Plugins → Dev Server stays enabled after a reload: synced plugin settings no longer turn off a plugin the dev plugin depends on, and the dev plugin's own enabled state is no longer recorded as the account's choice.
