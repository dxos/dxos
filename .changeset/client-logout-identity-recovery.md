---
'@dxos/plugin-client': minor
---

Rename the device storage reset to "Log out" and move the join-existing-identity and recovery-code resets into their own section behind the new `identityTestActions` option on `ClientPlugin` (off by default). The account, invitations, and usage panels are hidden when no hub URL is configured.
