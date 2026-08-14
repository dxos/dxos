---
'@dxos/halo': minor
'@dxos/plugin-client': minor
---

`@dxos/halo`'s `Identity` service gained the verbs consumers needed to leave `@dxos/client` behind for identity recovery and personal-space lookup.

- `Identity.personalSpaceId` returns `Option<SpaceId>` for the identity's HALO space, replacing `client.halo.identity.get()?.spaceKey` plus a manual `createIdFromSpaceKey`. It is a verb rather than a field on `Identity.Info` because the id comes from an async digest of the identity key.
- `Identity.createRecoveryCredential()` mints a recovery code; `Identity.createRecoveryCredential({ externalKey })` registers an externally held key (a passkey) with an optional label and kind. `Identity.revokeRecoveryCredential(lookupKey)` revokes one by its hex lookup key, and `Identity.requestRecoveryChallenge` returns the challenge a recovery key must sign. The WebAuthn ceremony stays at the call site; only the credential write moved into HALO.
- `Identity.recover` accepts a `passkey` variant carrying a WebAuthn assertion over a challenge, alongside the existing recovery-code, token, and recovery-proof forms.
- `Identity.create` accepts `data`, so profile metadata set at creation is no longer dropped.

`Halo.recoverIdentity` in `@dxos/client-protocol` now takes `RecoverIdentityArgs`, which adds the `external` (passkey assertion) variant. Passkey login therefore goes through the HALO proxy — which emits `identityChanged` — instead of the raw `IdentityService` RPC.

`plugin-client`'s `create-identity`, `create-recovery-code`, `create-passkey`, `redeem-passkey`, `redeem-token`, and `revoke-recovery-credential` operations use these verbs and no longer reach for the client or its services.
