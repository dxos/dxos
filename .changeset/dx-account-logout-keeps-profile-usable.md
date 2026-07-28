---
'@dxos/plugin-client': patch
---

Fix `dx account logout` leaving the profile unusable: it removed the data root directory without recreating it, so every subsequent command failed with "unable to open database file".
