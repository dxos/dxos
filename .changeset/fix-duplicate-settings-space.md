---
'@dxos/app-toolkit': patch
'@dxos/plugin-space': patch
---

Fix fresh onboarding creating a duplicate settings space: the settings-space bootstrap now waits for the genesis-created space instead of racing its creation, and profiles already carrying a duplicate resolve the space holding the default-space designation as canonical.
