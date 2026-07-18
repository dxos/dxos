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
`IdentityService`/`SpaceService` capabilities it contributes.

### HALO API added to support consumers

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

1. **Personal space id from identity creation.** `Identity.create` must return
   the personal `spaceId` (or add `Identity.personalSpaceId` / `Space.personal`).
   Today consumers read `client.halo.identity.get()?.spaceKey`.
2. **Recovery-credential creation.** `Identity.createRecoveryCredential({ recoveryKey,
algorithm, lookupKey })` (+ `requestRecoveryChallenge`). The WebAuthn/passkey
   ceremony stays at the call site; only the credential write moves to HALO.
3. **EDGE identity / VP-auth verb.** A HALO replacement for
   `createEdgeIdentity(client)` (`@dxos/client/edge`) + `presentCredentials`, so a
   consumer can attach the signed-in identity to an EDGE/Hub HTTP client.
4. **Device-invitation share for non-client UI.** `Identity.share()` must surface a
   flow/observable the UI can render without `@dxos/client/invitations`, plus a
   HALO-typed device that `@dxos/shell`'s `DeviceListItem` accepts (or a
   halo-typed list item). Today: `client.halo.share()` + client `Device`.
5. **Operation/hook to invoke `grantServiceAccess` from React.** The verb exists;
   a `ClientOperation` (or `useGrantServiceAccess`) is needed so components can
   call it without `client.halo.writeCredentials`.
6. **Identity atom for graph builders.** An `Atom`/observable bridge (or documented
   `Atom.make(Identity.identity…)` recipe) to replace
   `CreateAtom.fromObservable(client.halo.identity)` in app-graph builders.

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

| Plugin                                                                                                                                                                                                                                                                                                                                                                         | HALO     | Remaining `@dxos/client` / `@dxos/react-client` pins                                                                                                                                                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| plugin-client                                                                                                                                                                                                                                                                                                                                                                  | partial  | create-identity (1), create-passkey (2), useHubClient (3), DevicesContainer (4, 9), app-graph-builder (6, 9), invitations UI (8), the client provider + `IdentityService`/`SpaceService` capabilities (intentional boundary) |
| plugin-onboarding                                                                                                                                                                                                                                                                                                                                                              | partial  | WelcomeScreen/onboarding-manager/util/oauth (1, 2), ECHO (7)                                                                                                                                                                 |
| plugin-script                                                                                                                                                                                                                                                                                                                                                                  | partial  | react-surface credential write (5), deploy/functions helpers take a `client` param, EDGE (3), ECHO (7)                                                                                                                       |
| plugin-assistant                                                                                                                                                                                                                                                                                                                                                               | complete | edge-model-resolver EDGE identity (3), ECHO (7)                                                                                                                                                                              |
| plugin-connector                                                                                                                                                                                                                                                                                                                                                               | n/a      | EDGE (3), ECHO (7)                                                                                                                                                                                                           |
| plugin-payments                                                                                                                                                                                                                                                                                                                                                                | n/a      | EDGE (3)                                                                                                                                                                                                                     |
| plugin-comments                                                                                                                                                                                                                                                                                                                                                                | complete | ECHO (7)                                                                                                                                                                                                                     |
| plugin-thread                                                                                                                                                                                                                                                                                                                                                                  | complete | ECHO (7); `useIdentity` (story)                                                                                                                                                                                              |
| plugin-space                                                                                                                                                                                                                                                                                                                                                                   | complete | ECHO (7), invitations (8), config/mesh (9)                                                                                                                                                                                   |
| plugin-transcription                                                                                                                                                                                                                                                                                                                                                           | complete | ECHO (7)                                                                                                                                                                                                                     |
| plugin-markdown                                                                                                                                                                                                                                                                                                                                                                | complete | ECHO (7)                                                                                                                                                                                                                     |
| plugin-code                                                                                                                                                                                                                                                                                                                                                                    | complete | ECHO (7)                                                                                                                                                                                                                     |
| plugin-calls                                                                                                                                                                                                                                                                                                                                                                   | complete | config/services (9)                                                                                                                                                                                                          |
| plugin-meeting                                                                                                                                                                                                                                                                                                                                                                 | complete | ECHO (7)                                                                                                                                                                                                                     |
| plugin-iroh-beacon                                                                                                                                                                                                                                                                                                                                                             | complete | — (off client)                                                                                                                                                                                                               |
| plugin-observability                                                                                                                                                                                                                                                                                                                                                           | n/a      | config/telemetry (9)                                                                                                                                                                                                         |
| plugin-registry                                                                                                                                                                                                                                                                                                                                                                | n/a      | CLI commands construct the client                                                                                                                                                                                            |
| plugin-debug, plugin-devtools                                                                                                                                                                                                                                                                                                                                                  | n/a      | mesh/devtools (9), ECHO (7)                                                                                                                                                                                                  |
| plugin-space (CLI), plugin-client (CLI)                                                                                                                                                                                                                                                                                                                                        | n/a      | `src/commands/**` construct the client — separate execution model                                                                                                                                                            |
| plugin-board, -bookmarks, -chess, -chess-com, -conductor, -crm, -explorer, -file, -freeq, -heygen, -ibkr, -inbox, -kanban, -magazine, -map, -outliner, -preview, -sample, -search, -sequencer, -sheet, -spacetime, -stack, -status-bar, -studio, -support, -table, -trip, -video, -wnfs, -zen, -bluesky, -commerce, -pipeline, -routine, -native-filesystem, -sandbox, -doctor | n/a      | ECHO (7), and `/testing` (10) where present — no HALO usage                                                                                                                                                                  |

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
| `@dxos/client/edge`              | 6     | EDGE (3)                                      |
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
- **HALO remaining tier: outstanding** — Missing APIs 1–6 (identity-creation
  verbs, recovery credential, EDGE verb, device-invitation/Shell, script write-op,
  graph-builder atom). Only `plugin-client`, `plugin-onboarding`, `plugin-script`,
  and the EDGE consumers (`plugin-assistant`, `plugin-connector`, `plugin-payments`)
  still touch the client for HALO/EDGE. Tracked as task #7.
- **Full `@dxos/client`/`@dxos/react-client` elimination: future scope** — gated on
  Missing APIs 7–10 (ECHO React bindings dominate at ~340 imports), tracked
  separately from this HALO PR.
- **External blocker unchanged**: `check-packages-published` stays red until a
  maintainer publishes the three `@dxos/halo*` packages + OIDC.
