# @dxos/halo

## 0.12.0

### Minor Changes

- 0ef896f: Completes the HALO consumer-migration surface: no plugin reaches for `@dxos/client` to do HALO work anymore.

  - **`useInvitationFlow(flow)`** (`@dxos/halo-react`) renders any `Invitation.Flow` — its latest lifecycle event plus the shareable code — replacing a subscription to the client's `CancellableInvitationObservable`. The code is re-emitted with each event so a rendered QR and the flow state cannot tear.
  - **`Identity.DeviceInfo` gained `presence`, `os`, `platform`, and a populated `kind`**, which is what a device list needs to show status, name, and icon. `@dxos/shell`'s `DeviceListItem` now accepts the structural `ShellDevice` that `DeviceInfo` satisfies, so a HALO-backed caller renders it directly; shell's own client-backed `DeviceList` maps through the newly exported `toShellDevice`.
  - **`ClientOperation.GrantServiceAccess`** (`{ serverName, capabilities }`) wraps the existing `Identity.grantServiceAccess` verb so a component can grant EDGE/Hub access without the client's credential-write surface.
  - **`Identity.atom(service)`** is an `Atom<Option<Info>>` for reactive non-React consumers (app-graph builders), seeded from `getSnapshot()` and updated through `subscribe()`, keyed by service reference.

  plugin-client's `DevicesContainer` and app-graph-builder, and plugin-script's settings surface, use these. `DevicesContainer` keeps `useClient`/`useNetworkStatus` only for swarm status and the `DX_ENVIRONMENT` log gate — config and mesh access, not identity.

- 777d24a: `Identity.getEdgeIdentity()` returns the signed-in identity as an EDGE/Hub authentication principal — `Option<EdgeIdentity>` carrying the DID, the local device's peer key, and the `presentCredentials({ challenge })` signer that EDGE's `401` verifiable-presentation handshake requires. It is structurally the `EdgeIdentity` of `@dxos/edge-client`, so consumers hand it straight to `EdgeHttpClient.setIdentity` or `handleAuthChallenge` without depending on `@dxos/client`. Synchronous, like `getSnapshot`, because every consumer attaches it inside a React effect or an identity-change callback; the signing it defers is the asynchronous part.

  This replaces `createEdgeIdentity(client)` from `@dxos/client/edge` at every non-CLI call site: `plugin-client`'s hub HTTP client, `plugin-assistant`'s EDGE AI model resolver, `plugin-connector`'s coordinator, and `plugin-payments`.

  **Breaking for `@dxos/plugin-payments` consumers:** `getEdgeAuthHeader`, `createEdgeAuthedFetch`, `buyPremium`, and `createStripeCheckout` now take an `Identity.EdgeIdentity` as their first argument instead of a `Client`. The package no longer depends on `@dxos/client` or `@dxos/react-client` at all.

- 48fd9fe: `@dxos/halo`'s `Identity` service gained the verbs consumers needed to leave `@dxos/client` behind for identity recovery and personal-space lookup.

  - `Identity.personalSpaceId` returns `Option<SpaceId>` for the identity's HALO space, replacing `client.halo.identity.get()?.spaceKey` plus a manual `createIdFromSpaceKey`. It is a verb rather than a field on `Identity.Info` because the id comes from an async digest of the identity key.
  - `Identity.createRecoveryCredential()` mints a recovery code; `Identity.createRecoveryCredential({ externalKey })` registers an externally held key (a passkey) with an optional label and kind. `Identity.revokeRecoveryCredential(lookupKey)` revokes one by its hex lookup key, and `Identity.requestRecoveryChallenge` returns the challenge a recovery key must sign. The WebAuthn ceremony stays at the call site; only the credential write moved into HALO.
  - `Identity.recover` accepts a `passkey` variant carrying a WebAuthn assertion over a challenge, alongside the existing recovery-code, token, and recovery-proof forms.
  - `Identity.create` accepts `data`, so profile metadata set at creation is no longer dropped.

  `Halo.recoverIdentity` in `@dxos/client-protocol` now takes `RecoverIdentityArgs`, which adds the `external` (passkey assertion) variant. Passkey login therefore goes through the HALO proxy — which emits `identityChanged` — instead of the raw `IdentityService` RPC.

  `plugin-client`'s `create-identity`, `create-recovery-code`, `create-passkey`, `redeem-passkey`, `redeem-token`, and `revoke-recovery-credential` operations use these verbs and no longer reach for the client or its services.

### Patch Changes

- Updated dependencies [e954c0f]
- Updated dependencies [9ef5485]
- Updated dependencies [22bea85]
- Updated dependencies [b4ceea2]
- Updated dependencies [bdb02cd]
- Updated dependencies [48eb05d]
- Updated dependencies [73daef4]
- Updated dependencies [4e417e9]
- Updated dependencies [23d2d8c]
- Updated dependencies [e56276b]
- Updated dependencies [4689d66]
- Updated dependencies [e207c68]
- Updated dependencies [4663f24]
- Updated dependencies [2896a58]
- Updated dependencies [9e91762]
- Updated dependencies [f8bfba0]
- Updated dependencies [85e6347]
  - @dxos/protocols@0.12.0
  - @dxos/errors@0.12.0
  - @dxos/keys@0.12.0

## 0.11.1

### Patch Changes

- @dxos/errors@0.11.1
- @dxos/keys@0.11.1

## 0.11.0

### Patch Changes

- 6439417: Publish the HALO Effect service packages (`@dxos/halo`, `@dxos/halo-adapter-client`, `@dxos/halo-react`) and begin migrating Composer/plugins off direct `@dxos/client` HALO access onto them: `plugin-client` now provides `Identity.Service` / `Space.Service` layer specs and wraps the app in `HaloProvider`.
- Updated dependencies [6a03a30]
  - @dxos/keys@0.11.0
  - @dxos/errors@0.11.0
