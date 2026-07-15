# HALO consumer migration — plan & decisions

Working plan for migrating Composer/plugins off direct `@dxos/client` HALO access
onto the `@dxos/halo` Effect services. Tracks the settled preferences so scope
does not need to be re-litigated.

## Settled preferences (do not re-ask)

- **One big PR.** The entire migration lands in a single PR (#12229) on branch
  `claude/halo-api-audit-migration-w5al1i`. Do not split into follow-ups.
- **Extend the HALO API as needed.** Where a consumer needs something the
  DID-only `Identity.Info` dropped, extend the HALO service/adapter rather than
  leaving the consumer on `@dxos/client`. Planned extensions:
  - `Identity.Info`: add `identityKey` (hex) back, and `profile` data
    (`{ displayName?, data? }`) so Profile UI (emoji/hue) works.
  - `Identity.updateProfile`: accept `{ displayName?, data? }`.
  - `Identity`: add `updateDevice`, credential query/write, recovery-credential
    creation (`createRecoveryCredential` / `requestRecoveryChallenge`), and EDGE
    attest (`createEdgeIdentity`/`presentCredentials`) verbs.
  - `Identity.create`: expose the personal `spaceId` (or add `Space.personal`).
  - `useCredentials` hook in `@dxos/halo-react`.
- **ECHO stays separate.** `space.db` / `useQuery` / properties remain on
  `@dxos/echo` / `@dxos/react-client/echo` — that is the ECHO track, not
  `@dxos/client` HALO. `useSpaces`/`useSpace` sites that exist only to reach
  `space.db` are NOT migrated to `@dxos/halo-react`.
- **Mutations route through Operations** (app-framework), handlers use the
  services; components dispatch operations.

## Known external blocker (not fixable from here)

CI `check-packages-published` requires `@dxos/halo`, `@dxos/halo-adapter-client`,
`@dxos/halo-react` to be published to npm with OIDC trusted publishing. That is a
maintainer/release action. The PR stays red on that one check until a maintainer
publishes the packages; all other checks should be green.

## Phases (all in the one PR)

1. **plugin-client foundation** — DONE: `IdentityLayerSpec`/`SpaceLayerSpec`,
   `HaloProvider`, deps. Packages made publishable.
2. **Extend HALO API + adapter** — add the verbs/fields above to `@dxos/halo`
   and implement in `@dxos/halo-adapter-client`; add `useCredentials` and any
   missing hooks to `@dxos/halo-react`.
3. **plugin-client operations** — `create-identity`, `update-profile` (new),
   recovery/passkey, device update: declare + use `Identity.Service`.
4. **plugin-client containers** — Account (DONE), Profile, Devices, Recovery.
5. **Other plugins** — swap `useIdentity`/`useDevices`/`useMembers`/
   space-invitation hooks to `@dxos/halo-react`; leave ECHO `space.db` sites.
6. **Cleanup** — drop now-unused `@dxos/react-client/halo` imports; changeset.

## Status

- Phase 1: done (commits on the branch).
- Phase 2+: in progress.
