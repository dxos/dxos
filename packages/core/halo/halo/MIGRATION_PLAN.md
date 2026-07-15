# HALO consumer migration — plan & decisions

Working plan for migrating Composer/plugins off direct `@dxos/client` HALO access
onto the `@dxos/halo` Effect services. Tracks the settled preferences so scope
does not need to be re-litigated.

## Settled preferences (do not re-ask)

- **One big PR.** Land as much of the migration as cleanly possible in a single
  PR (#12229) on branch `claude/halo-api-audit-migration-w5al1i`, rather than a
  string of small follow-ups. The one acknowledged exception is the deferred
  service verbs (see Phase 2 / Status below): the consumers that depend on them
  cannot migrate until those verbs exist, so they remain outstanding regardless
  of PR count.
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

## Migration outcome — what moved and what stays

### Migrated to `@dxos/halo` / `@dxos/halo-react`

- **plugin-client foundation** — `react-context.tsx` wraps the tree in
  `HaloProvider`; `layer-specs.ts` contributes `IdentityLayerSpec`/`SpaceLayerSpec`
  so the process manager resolves the services. `Identity.Info` extended with
  `identityKey` (hex) + `data`.
- **plugin-client containers/operations** — `AccountContainer`, `ProfileContainer`;
  `UpdateProfile` operation routes through `Identity.Service`.
- **plugin-assistant** — `Chat`, `ChatThread` (`useIdentity`).
- **plugin-comments** — `CommentsArticle` (`useIdentity`, DID only).
- **plugin-transcription** — `useTranscriptionRecording`.
- **plugin-markdown / plugin-code / plugin-script** — editor identity now sourced
  from `@dxos/halo-react`. Enabled by narrowing `createDataExtensions` in
  `@dxos/ui-editor` to a structural `DataExtensionsIdentity`
  (`{ identityKey?, displayName?, data? }`), which the halo `Identity.Info`
  satisfies — no `@dxos/halo` dependency pushed into the foundational editor.

### Deliberately NOT migrated (separate tracks / blocked)

These consume the **client** identity type through boundaries the settled
decisions keep on `@dxos/client`. Moving them is out of scope for the HALO
service migration, not an oversight:

- **ECHO `SpaceMember` sites** — `plugin-space/SpacePresence`,
  `plugin-thread` (`MessageThread`, `ThreadArticle`, `ChannelArticle`, `util`),
  `plugin-comments` (`CommentThread`, `util`). These read members via
  `useMembers` from `@dxos/react-client/echo` (`SpaceMember.identity.identityKey:
PublicKey`) and compare with `PublicKey.equals`, and feed `getMessageMetadata`
  from both the local identity and member identities. This is the ECHO members
  track, which stays separate.
- **Shell / client-invitation UI** — `plugin-client/DevicesContainer` feeds the
  client `Device` into `@dxos/shell`'s `DeviceListItem` and creates device
  invitations via the client observable API (`client.halo.share()`,
  `useMulticastObservable`, `InvitationEncoder`). Shell + the invitation
  observable API are a separate track.
- **Credential / recovery / onboarding flows** — `RecoveryCredentialsContainer`,
  `useHubClient`, `plugin-onboarding` (`WelcomeScreen`, `onboarding-manager`,
  `util`). These need the deferred HALO verbs (credential query/write,
  recovery-credential creation, EDGE attest) and pass identity into the
  client-typed `Welcome` prop. Blocked until the Phase 2 verbs land.
- **CLI commands** (`plugin-client/src/commands/**`, `plugin-registry`,
  `plugin-script` deploy) and **capabilities/operations that hold the client at
  the process-manager boundary** (`client.ts`, `create-identity`, etc.) — these
  are the layer that _provides_ the client to the services; they stay on
  `@dxos/client` by design.

## Status

- **Phase 1 (foundation): done.**
- **Phase 4/5 (clean consumer sites): done** for every site whose only HALO use is
  identity/DID reads not bound to ECHO members, Shell, or deferred verbs.
- **Phase 2 (deferred verbs) + the client-typed remainder: not done.** Requires
  implementing credential/recovery/device/EDGE verbs in `@dxos/halo` +
  `@dxos/halo-adapter-client`, then migrating Recovery/Devices/onboarding. Tracked
  as task #7. The ECHO-member and Shell sites are intentionally out of scope.
