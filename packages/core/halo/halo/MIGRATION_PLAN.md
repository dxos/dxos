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

The migration decision is: **plugins consume HALO via `@dxos/halo` /
`@dxos/halo-react`, never `@dxos/client` HALO APIs.** ECHO `space.db` stays on
`@dxos/echo`. The only place the client backs HALO is the adapter
(`@dxos/halo-adapter-client`) and plugin-client's client provider + the
`HaloIdentity`/`HaloSpace` capabilities it contributes.

### HALO API added to support consumers

- `Identity.Info` gained `identityKey` (hex) + `data`; `Space.Member` gained
  `identityKey` (hex), `displayName`, `data`.
- `Identity`: `credentials` stream + `Credential` type, `grantServiceAccess`
  verb, synchronous `getSnapshot()` / `getDevicesSnapshot()` and imperative
  `subscribe()` for non-React/non-Effect callers.
- `@dxos/halo-react`: `useCredentials` (plus existing useIdentity/useDevices/
  useMembers/useSpaces/useInvitations).
- plugin-client contributes `ClientCapabilities.HaloIdentity` / `HaloSpace`
  (the service instances) for imperative capability singletons.

### Migrated (off `@dxos/client` HALO)

- **React consumers** — plugin-client (Account/Profile/Recovery containers,
  UpdateProfile operation), plugin-assistant (Chat/ChatThread),
  plugin-comments (CommentsArticle, CommentThread + `getMessageMetadata`),
  plugin-transcription (useTranscriptionRecording, TranscriptionArticle),
  plugin-markdown / plugin-code / plugin-script editors, plugin-thread
  (MessageThread/ThreadArticle/ChannelArticle), plugin-space (SpacePresence).
  Enabled by narrowing shared UI signatures to structural types
  (`DataExtensionsIdentity` in `@dxos/ui-editor`, `BylineIdentity` in
  `@dxos/react-ui-transcription`, `MessageAuthor` in thread/comments) that the
  HALO `Identity.Info` / `Space.Member` satisfy — no `@dxos/halo` dependency
  pushed into foundational UI packages.
- **Imperative capability singletons** — plugin-iroh-beacon (beacon-service),
  plugin-assistant (edge-model-resolver identity reads), plugin-calls
  (call-manager + CallSwarmSynchronizer), plugin-meeting (call-extension),
  plugin-space (navigation-handler, spaces-ready, join operation),
  plugin-transcription (transcriber) — all read identity/devices via the
  `HaloIdentity` capability (`getSnapshot`/`getDevicesSnapshot`/`subscribe`).

### Remaining (still on `@dxos/client`), by reason

1. **EDGE VP-auth** — `createEdgeIdentity(client)` from `@dxos/client/edge`
   (edge-model-resolver, useHubClient, plugin-connector, plugin-payments). Not
   `client.halo`; needs a HALO EDGE-identity/`presentCredentials` verb before
   these can drop the client.
2. **Security-sensitive identity creation** — `create-identity` (needs the
   personal `spaceId` returned from HALO `create`), `create-passkey` (needs a
   `createRecoveryCredential` verb; the WebAuthn ceremony stays local).
3. **Onboarding** — WelcomeScreen / onboarding-manager / util / oauth flows:
   `client.halo.identity` + `createDidFromIdentityKey` (replaceable with the
   HALO `.did`) + credential/device queries. Migratable via the new snapshot/
   subscribe/credentials API but security-sensitive (recovery/oauth) and
   unverified without running; deferred for careful review.
4. **plugin-script credential write** — react-surface `writeCredentials` maps to
   the new `grantServiceAccess` verb but needs a client operation to invoke it
   from React; deploy helpers receive a `client` param (not capability context).
5. **DevicesContainer** — Shell `DeviceListItem` (client `Device`) + device
   invitation observable API (`client.halo.share`).
6. **app-graph-builder** — `client.halo.identity` atom (keeps client for
   `client.mesh` regardless); low-value, deferred.
7. **CLI commands** (`plugin-*/src/commands/**`) — construct the client directly;
   a separate execution model.

## Status

- **React consumer tier: complete.**
- **Imperative singleton tier: complete** except the EDGE-auth and script/onboarding
  cases above.
- **Remaining tier (EDGE verb, identity-creation verbs, onboarding, script write,
  DevicesContainer/Shell, CLI): outstanding**, tracked as task #7 — each needs a
  new HALO verb, a Shell type change, or careful review of security-sensitive
  flows that cannot be run-verified in this environment.
- **External blocker unchanged**: `check-packages-published` stays red until a
  maintainer publishes the three `@dxos/halo*` packages + OIDC.
