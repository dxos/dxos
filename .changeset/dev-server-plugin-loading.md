---
'@dxos/app-framework': patch
'@dxos/plugin-space': patch
---

A plugin loaded through Plugins → Dev Server loads from the right server and stays enabled after a reload. `composerPlugin`'s dev and preview servers now fail when their port is taken instead of moving to the next free one, so the setting never loads a plugin from whatever else holds port 3967. Synced plugin settings no longer turn off a plugin the dev plugin depends on, and no longer record the dev plugin's own enabled state as the account's choice.
