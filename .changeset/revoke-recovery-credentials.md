---
'@dxos/protocols': minor
'@dxos/plugin-client': minor
---

Recovery credentials can be labelled, told apart by kind, and revoked from Composer.

`dxos.halo.credentials.IdentityRecovery` gains `label` and `kind` (`PASSKEY`, `RECOVERY_CODE`, `OAUTH`), so a management surface can distinguish a passkey from a recovery code rather than showing a column of identical dates. Both are set at creation: the passkey flow derives a default label from the platform, the recovery-code flow labels itself.

A new `dxos.halo.credentials.IdentityRecoveryRevoked` assertion cancels a recovery credential. It is written to the identity's own control feed, mirroring how `SpaceDeleted` tombstones a space — the feed is append-only, so the original credential stays and the revocation marks it spent, and it replicates to the user's other devices. `IdentityService.revokeRecoveryCredential` writes it and refuses the last un-revoked credential.

`Identity.Credential` gains an optional `recovery` field (`lookupKey`, `label`, `kind`, `revoked`) so consumers of the public HALO view can render and revoke without reaching into protobuf assertions.
