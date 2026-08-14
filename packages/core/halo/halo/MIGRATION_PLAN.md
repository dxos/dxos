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

## Publish blocker — CLEARED

`check-packages-published` used to fail because `@dxos/halo`,
`@dxos/halo-adapter-client`, and `@dxos/halo-react` had never been published. All
three are on npm at 0.11.1, so the check passes; the maintainer/release action is
done and no longer gates this work.

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
`IdentityService`/`SpaceService` capabilities it contributes.

### HALO API added to support consumers (APIs 1-6)

- `Identity.Info` gained `identityKey` (hex) + `data`; `Space.Member` gained
  `identityKey` (hex), `displayName`, `data`.
- `Identity`: `credentials` stream + `Credential` type, `grantServiceAccess`
  verb, synchronous `getSnapshot()` / `getDevicesSnapshot()` and imperative
  `subscribe()` for non-React/non-Effect callers.
- `@dxos/halo-react`: `useCredentials` (plus existing useIdentity/useDevices/
  useMembers/useSpaces/useInvitations).
- plugin-client contributes `ClientCapabilities.IdentityService` / `SpaceService`
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
  `IdentityService` capability (`getSnapshot`/`getDevicesSnapshot`/`subscribe`).

## Missing APIs

The end goal (per maintainer direction) is to **eliminate all `@dxos/client` and
`@dxos/react-client` imports from `packages/plugins/*` and `packages/ui/*`**. The
following APIs do not yet exist and block that; every plugin line below that is
not "complete" references one of these numbers.

### HALO (this PR's surface)

1. ~~**Personal space id from identity creation.**~~ DONE — `Identity.personalSpaceId`
   returns `Option<SpaceId>` for the identity's HALO space. A verb, not a field on
   `Info`, because the id is derived from the identity key by an async digest.
   `Identity.create` also accepts `data` now, so profile metadata survives creation.
2. ~~**Recovery-credential creation.**~~ DONE — `Identity.createRecoveryCredential`
   (no argument mints a recovery code; `{ externalKey: { recoveryKey, lookupKey,
algorithm, label?, kind? } }` registers a passkey), `Identity.requestRecoveryChallenge`,
   `Identity.revokeRecoveryCredential(lookupKey)`, and a `passkey` variant on
   `Identity.recover` that carries a WebAuthn assertion over a challenge. The
   WebAuthn ceremony stays at the call site; only the credential write moved.
   `client-protocol`'s `Halo.recoverIdentity` was widened to the `external` variant
   (new `RecoverIdentityArgs`) so the passkey path goes through the proxy — which
   emits `identityChanged` — instead of the raw `IdentityService` RPC.
3. ~~**EDGE identity / VP-auth verb.**~~ DONE — `Identity.getEdgeIdentity()` returns
   `Option<EdgeIdentity>`: the DID, the local device's peer key, and the
   `presentCredentials({ challenge })` signer EDGE's `401` handshake needs. Structurally
   the `EdgeIdentity` of `@dxos/edge-client`, so consumers pass it straight to
   `setIdentity` / `handleAuthChallenge`. Synchronous (like `getSnapshot`) because every
   consumer attaches it inside a React effect or an identity-change callback; the signing
   it defers is the async part. `@dxos/halo` took a type-only `@dxos/protocols` dependency
   for the `Presentation` return type.
4. ~~**Device-invitation share for non-client UI.**~~ DONE — `useInvitationFlow(flow)` in
   `@dxos/halo-react` renders any `Invitation.Flow` (latest lifecycle event + shareable
   code) in place of subscribing to the client's `CancellableInvitationObservable`, and
   `@dxos/shell`'s `DeviceListItem` now takes the structural `ShellDevice`, which
   `Identity.DeviceInfo` satisfies. `DeviceInfo` gained `presence`, `os`, `platform`, and a
   populated `kind` so the list renders status, name, and icon from HALO alone; shell's own
   client-backed `DeviceList` maps through the exported `toShellDevice`.
5. ~~**Operation to invoke `grantServiceAccess` from React.**~~ DONE — `ClientOperation.GrantServiceAccess`
   (`{ serverName, capabilities }`) wraps the verb, and plugin-script's settings surface
   dispatches it instead of hand-building a `ServiceAccess` credential and calling
   `client.halo.writeCredentials`.
6. ~~**Identity atom for graph builders.**~~ DONE — `Identity.atom(service)` is an
   `Atom<Option<Info>>` seeded from `getSnapshot()` and updated through `subscribe()`,
   keyed by service reference. plugin-client's app-graph-builder uses it in place of
   `CreateAtom.fromObservable(client.halo.identity)`.

### ECHO track (separate, much larger — ~340 imports)

7. **`@dxos/echo` / `@dxos/echo-client` React bindings** replacing
   `@dxos/react-client/echo` (and `@dxos/client/echo`): `useQuery`, `useSpace`,
   `useSpaces`, `useObject`, `getSpace`, and the `Space` / `SpaceMember` value
   types. This is the single biggest blocker to dropping `@dxos/react-client`.
8. **Space-invitation UI via HALO.** Migrate `@dxos/react-client/invitations` +
   `@dxos/client/invitations` UIs onto `Space.share` / `Space.join` /
   `Space.invitations` (the verbs exist; the React/observable surface does not).

### Platform / root client

9. **Config / mesh / services access** without the `@dxos/client` root export or
   `useClient` — e.g. `client.config`, `client.mesh.networkStatus`,
   `client.services`. Needed by app-graph-builder, DevicesContainer (network
   status), plugin-debug, and every `useClient()`/`Client`/`Config` site.
10. **Test harness.** A replacement for `@dxos/react-client/testing`
    (`withClientProvider`, `useClientStory`) used by plugin stories/tests. Low
    priority; unblocks the last imports after 7–9 land.

## Composer plugins

HALO column: status of _this_ migration (HALO off `@dxos/client`). Blockers:
what still pins `@dxos/client` / `@dxos/react-client`, by Missing-API number
above. **Any plugin not listed here imports neither `@dxos/client` nor
`@dxos/react-client` in non-test/story source — complete.** `(story)` = the only
remaining import is in a `*.stories.tsx`.

| Plugin                                                                                                                                                                                                                                                                                                                                                                         | HALO     | Remaining `@dxos/client` / `@dxos/react-client` pins                                                                                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| plugin-client                                                                                                                                                                                                                                                                                                                                                                  | complete | DevicesContainer network status + `DX_ENVIRONMENT` gate (9), app-graph-builder config/mesh (9), invitations UI (8), the client provider + `IdentityService`/`SpaceService` capabilities (intentional boundary) |
| plugin-onboarding                                                                                                                                                                                                                                                                                                                                                              | partial  | WelcomeScreen/onboarding-manager/util (credential query, see below), oauth-recovery-redirect (3), ECHO (7)                                                                                                     |
| plugin-script                                                                                                                                                                                                                                                                                                                                                                  | complete | deploy/functions helpers take a `client` param, ECHO (7)                                                                                                                                                       |
| plugin-assistant                                                                                                                                                                                                                                                                                                                                                               | complete | ECHO (7); `Client` type in `testing/snapshot.ts`                                                                                                                                                               |
| plugin-connector                                                                                                                                                                                                                                                                                                                                                               | complete | ECHO (7), config (9); `Client` type in `ConnectorSpec`, CLI `ClientService`                                                                                                                                    |
| plugin-payments                                                                                                                                                                                                                                                                                                                                                                | complete | — (off client)                                                                                                                                                                                                 |
| plugin-comments                                                                                                                                                                                                                                                                                                                                                                | complete | ECHO (7)                                                                                                                                                                                                       |
| plugin-thread                                                                                                                                                                                                                                                                                                                                                                  | complete | ECHO (7); `useIdentity` (story)                                                                                                                                                                                |
| plugin-space                                                                                                                                                                                                                                                                                                                                                                   | complete | ECHO (7), invitations (8), config/mesh (9)                                                                                                                                                                     |
| plugin-transcription                                                                                                                                                                                                                                                                                                                                                           | complete | ECHO (7)                                                                                                                                                                                                       |
| plugin-markdown                                                                                                                                                                                                                                                                                                                                                                | complete | ECHO (7)                                                                                                                                                                                                       |
| plugin-code                                                                                                                                                                                                                                                                                                                                                                    | complete | ECHO (7)                                                                                                                                                                                                       |
| plugin-calls                                                                                                                                                                                                                                                                                                                                                                   | complete | config/services (9)                                                                                                                                                                                            |
| plugin-meeting                                                                                                                                                                                                                                                                                                                                                                 | complete | ECHO (7)                                                                                                                                                                                                       |
| plugin-iroh-beacon                                                                                                                                                                                                                                                                                                                                                             | complete | — (off client)                                                                                                                                                                                                 |
| plugin-observability                                                                                                                                                                                                                                                                                                                                                           | n/a      | config/telemetry (9)                                                                                                                                                                                           |
| plugin-registry                                                                                                                                                                                                                                                                                                                                                                | n/a      | CLI commands construct the client                                                                                                                                                                              |
| plugin-debug, plugin-devtools                                                                                                                                                                                                                                                                                                                                                  | n/a      | mesh/devtools (9), ECHO (7)                                                                                                                                                                                    |
| plugin-space (CLI), plugin-client (CLI)                                                                                                                                                                                                                                                                                                                                        | n/a      | `src/commands/**` construct the client — separate execution model                                                                                                                                              |
| plugin-board, -bookmarks, -chess, -chess-com, -conductor, -crm, -explorer, -file, -freeq, -heygen, -ibkr, -inbox, -kanban, -magazine, -map, -outliner, -preview, -sample, -search, -sequencer, -sheet, -spacetime, -stack, -status-bar, -studio, -support, -table, -trip, -video, -wnfs, -zen, -bluesky, -commerce, -pipeline, -routine, -native-filesystem, -sandbox, -doctor | n/a      | ECHO (7), and `/testing` (10) where present — no HALO usage                                                                                                                                                    |

## `@dxos/client` / `@dxos/react-client` usage inventory (snapshot)

Import counts across `packages/plugins/*/src` + `packages/ui/*/src`
(non-test/story), to size the elimination effort:

| Import                           | Count | Track                                         |
| -------------------------------- | ----- | --------------------------------------------- |
| `@dxos/react-client/echo`        | 288   | ECHO (7)                                      |
| `@dxos/client` (root)            | 102   | platform (9)                                  |
| `@dxos/react-client/testing`     | 67    | test harness (10)                             |
| `@dxos/react-client` (root)      | 64    | platform (9)                                  |
| `@dxos/client/echo`              | 52    | ECHO (7)                                      |
| `@dxos/react-client/halo`        | 8     | HALO — plugin-client + plugin-onboarding only |
| `@dxos/client/invitations`       | 7     | invitations (8)                               |
| `@dxos/client/edge`              | 3     | CLI commands only (`src/commands/**`)         |
| `@dxos/react-client/invitations` | 4     | invitations (8)                               |
| `@dxos/react-client/mesh`        | 3     | platform (9)                                  |
| `@dxos/client/halo`              | 3     | HALO — plugin-client + plugin-onboarding      |
| `@dxos/react-client/devtools`    | 1     | devtools (9)                                  |
| `@dxos/client/testing`           | 1     | test harness (10)                             |

**`react-ui*` packages still importing the client** (all ECHO/root, none HALO
after this PR): `@dxos/client` → `react-ui-editor`, `react-ui-masonry`,
`ui-editor`; `@dxos/react-client` → `react-ui-canvas-compute`,
`react-ui-canvas-editor`, `react-ui-chat`, `react-ui-components`,
`react-ui-editor`, `react-ui-form`, `react-ui-markdown`, `react-ui-masonry`,
`react-ui-mosaic`, `react-ui-table`, `react-ui-transcription`. These block on
Missing API 7 (ECHO React bindings), not on HALO.

## Status

- **HALO React consumer tier: complete.**
- **HALO imperative singleton tier: complete** except the EDGE-auth (3) and
  script/onboarding cases.
- **HALO tier COMPLETE: Missing APIs 1–6 are all DONE.** No plugin reaches for
  `@dxos/client` to do HALO work anymore. What remains in the plugins is the
  non-HALO set: ECHO (7), space-invitation UI (8), config/mesh/services (9), and the
  test harness (10) — plus two deliberate boundaries, the CLI `src/commands/**`
  (which construct the client) and plugin-client's own client provider. The
  DevicesContainer keeps `useClient`/`useNetworkStatus` for exactly those reasons
  (swarm status and the `DX_ENVIRONMENT` gate), not for identity or devices.
- **Full `@dxos/client`/`@dxos/react-client` elimination: future scope** — gated on
  Missing APIs 7–10 (ECHO React bindings dominate at ~340 imports), tracked
  separately from this HALO PR.
- **External blocker cleared**: the three `@dxos/halo*` packages are published at
  0.11.1.

### Two carve-outs found while landing APIs 1–2

- **`requestRecoveryChallenge` is EDGE-only.** `IdentityRecoveryManager` asserts an
  EDGE connection, so the verb exists and is typed but cannot be covered by the
  in-process `halo-e2e` harness (`TestBuilder` peers have no EDGE). Its e2e test is
  deliberately absent rather than skipped-with-a-fake.
- **`oauth-recovery-redirect` still holds a client.** Not for EDGE identity — it needs
  `Account.createHubClient` and a 30s `recoverIdentity` timeout that differs from the
  proxy's 20s. Migrating it is a decision about that timeout, not a missing verb.
- **`plugin-onboarding`'s `queryAllCredentials` is not a HALO gap.** It exists
  because `HaloProxy.queryCredentials` only returns credentials already loaded in
  the client, so it reads the feed through `SpacesService.queryCredentials` with the
  identity's space key. `Identity.credentials` inherits the same limitation — an
  exhaustive credential _query_ verb (distinct from the live stream) is a new
  requirement, not part of API 2.
