---
'@dxos/plugin-support': patch
---

Point the help menu's app download at the running environment's release channel. CrabNebula's dashboard only lists the primary channel, so a prerelease deployment previously linked users at an installer for a different channel than the one they were using; it now links straight at that channel's latest installer via the CDN's public download endpoint.
