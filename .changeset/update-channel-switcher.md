---
'@dxos/plugin-native': minor
---

Add a Stable/Nightly release channel picker to native settings. Switching confirms with a system dialog, then downloads and installs the selected channel's latest build immediately — the periodic check would never offer it, since the two channels are ordered against each other.

Switching to Nightly is currently one-way for data: several migration mechanisms record their version inside replicated ECHO data rather than local storage, so an upgrade performed by a nightly build reaches every device and every member of a shared space, and reinstalling Stable does not undo it. The confirm dialog says so; a supported downgrade needs backward-compatible version checks in ECHO first.
