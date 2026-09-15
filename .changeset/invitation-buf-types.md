---
'@dxos/client': minor
---

**Breaking:** `Invitation` and `QueryInvitationsResponse` are now the buf-generated types. `InvitationsService` carries them over `bufMessage`, which matches the previous wire format byte-for-byte apart from proto3 default values that protobuf.js wrote explicitly, so invitation codes stay interchangeable across the change.

Consumers of `@dxos/client/invitations` and `@dxos/react-client/invitations`:

- Nested enums are flattened: `Invitation.State.SUCCESS` becomes `Invitation_State.SUCCESS`, and likewise for `Type`, `Kind` and `AuthMethod`. The enum values are unchanged.
- `Invitation` is now a type; construct one with `create(InvitationSchema, { ... })` from `@bufbuild/protobuf`.
- Key fields (`spaceKey`, `swarmKey`, `identityKey`, `delegationCredentialId`) are `dxos.keys.PublicKey` messages rather than the `PublicKey` class. Read one with `PublicKey.from(key.data)`; the `useInvitationStatus` hook still reports the class.
- `created` is a `google.protobuf.Timestamp` rather than a `Date`.
