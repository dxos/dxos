---
'@dxos/plugin-computer': patch
---

In a browser, the Composer Plugin project template now has the agent write its plugin for `composerPlugin`'s Vite dev server on port 3967 and check it there, and tells you to load it from Plugin Settings → Plugins → Dev Server. The template no longer builds into Composer's own output folder or assumes the app is served on port 4173. The desktop variant is unchanged.
