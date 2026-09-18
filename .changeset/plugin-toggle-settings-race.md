---
'@dxos/plugin-registry': patch
---

A plugin toggled in the registry soon after the app loads no longer switches itself back off. The switch now stays disabled until the account's plugin set is bound, and settings sync no longer republishes a plugin's old state while a change to it is still being applied.
