---
'@dxos/plugin-client': minor
---

Rename the device storage reset to "Log out" and gate the join-existing-identity and recovery-code resets behind the new `identityRecovery` option on `ClientPlugin` (off by default).
