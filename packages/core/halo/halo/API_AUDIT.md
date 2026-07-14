# HALO API Audit — Composer & Plugins

Inventory of every HALO-related API from `@dxos/client` / `@dxos/react-client` consumed by
Composer (`packages/apps/composer-app`) and the plugins (`packages/plugins/*`), followed by an
evaluation of how `@dxos/halo` Effect services can replace that surface so application code no
longer depends on `@dxos/client` directly.

Companion to [MIGRATION.md](./MIGRATION.md) (HALO → Keyhive). The migration plan describes the
_backend_ rewrite; this document describes the _consumer-facing_ seam that must exist regardless
of which backend (legacy client, EDGE shim, or Keyhive) is active — see MIGRATION.md §A.2.

Method: static audit (2026-07-13) of `packages/apps/composer-app` and `packages/plugins`,
excluding tests. Storybook fixtures are included but flagged, since they define the testing
surface the new package must also serve.

## 1. Entry points

Import counts across Composer + plugins (production code and stories):

| Import source                    | Files | Notes                                                                                                                                         |
| -------------------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `@dxos/react-client/echo`        | 268   | Mostly ECHO db/query hooks (out of scope), but also `useSpaces`, `useSpace`, `useMembers`, `useSpaceInvitations`, `SpaceMember`, `SpaceState` |
| `@dxos/client`                   | 88    | `Client` type, `ClientService`, `PublicKey` re-export                                                                                         |
| `@dxos/react-client`             | 64    | `useClient`, `useConfig`, `useMulticastObservable`                                                                                            |
| `@dxos/client/echo`              | 52    | `getSpace`, `Space`, `SpaceState`, `SpaceMember`                                                                                              |
| `@dxos/react-client/halo`        | 26    | `useIdentity`, `useDevices`, `useCredentials`, `Identity`, `Device`, `Credential` types                                                       |
| `@dxos/client/invitations`       | 7     | `Invitation`, `InvitationEncoder`, `hostInvitation`, observables                                                                              |
| `@dxos/react-client/invitations` | 4     | Same, from React entry point                                                                                                                  |
| `@dxos/client/halo`              | 4     | `Identity`, `Device`, `DeviceKind`, `DeviceType`, `Credential`                                                                                |
| `@dxos/client/edge`              | 5     | `createEdgeIdentity` (credential-presentation auth)                                                                                           |
| `@dxos/shell/react`              | 2+    | `SpaceMemberList`, `InvitationList`, `AuthCode` UI components                                                                                 |

Almost all plugins obtain the client via the `ClientCapabilities.Client` capability provided by
`plugin-client` — the capability system is already the single injection point, which makes the
service swap tractable.

## 2. API surface by aspect

### 2.1 Identity

`client.halo.identity` (a `MulticastObservable<Identity | null>`) is by far the most used API
(~40 call sites + 20 hook usages).

| API                                                     | Count | Consumers                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `halo.identity.get()`                                   | ~40   | Gating ("has identity?"): plugin-space (`navigation-handler`, `operations/join`, `spaces-ready`), plugin-registry, plugin-onboarding, plugin-client CLI commands. Reading fields (`identityKey`, `did`, `spaceKey`, `profile`): composer-app recovery pages, plugin-script deploy, plugin-transcription, plugin-meeting, plugin-iroh-beacon |
| `halo.identity.subscribe()`                             | 5     | plugin-client (`capabilities/client.ts` — layout mode on login), plugin-calls (`call-manager`), plugin-onboarding (`onboarding-manager`), plugin-assistant (`edge-model-resolver`)                                                                                                                                                          |
| `CreateAtom.fromObservable(identity)`                   | 1     | plugin-client `app-graph-builder` — bridges the observable into the atom-based graph                                                                                                                                                                                                                                                        |
| `useIdentity()` hook                                    | ~20   | plugin-assistant (Chat), plugin-thread, plugin-comments, plugin-markdown (collab identity), plugin-code, plugin-script, plugin-space (SpacePresence), plugin-transcription, plugin-onboarding (WelcomeScreen), plugin-client (Account/Profile containers)                                                                                   |
| `halo.createIdentity(profile?)`                         | 14    | Operation handler (`plugin-client/operations/create-identity`), testing (`initializeIdentity`), ~10 story fixtures, import scripts (plugin-inbox, plugin-onboarding)                                                                                                                                                                        |
| `halo.recoverIdentity({...})`                           | 4     | plugin-client `account login` and `halo recover` CLI commands                                                                                                                                                                                                                                                                               |
| `halo.updateProfile(profile)`                           | 1     | plugin-client `ProfileContainer`                                                                                                                                                                                                                                                                                                            |
| `identity.did` / `identityKey` / `spaceKey` / `profile` | many  | Field reads wherever identity is obtained                                                                                                                                                                                                                                                                                                   |

### 2.2 Devices

| API                                        | Count | Consumers                                                                                                                             |
| ------------------------------------------ | ----- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `halo.device`                              | 6     | plugin-client `device info/update` commands, plugin-calls (presence key), plugin-iroh-beacon (`deviceKey`)                            |
| `halo.devices.get()` / `useDevices()`      | 4     | plugin-client `DevicesContainer`, `device list` command, plugin-onboarding (`onboarding-manager` — device count gates recovery hints) |
| `Device`, `DeviceKind`, `DeviceType` types | 3     | plugin-client device UI/CLI formatting                                                                                                |
| `DevicesService.updateDevice` (raw RPC)    | 1     | plugin-client `device update` command — no proxy-level API exists                                                                     |

### 2.3 Credentials & recovery

| API                                                  | Count | Consumers                                                                                                        |
| ---------------------------------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------- |
| `halo.credentials.subscribe()` / `useCredentials()`  | 3     | plugin-client `credential list` command, `RecoveryCredentialsContainer` (filters `IdentityRecovery` credentials) |
| `halo.queryCredentials({ type })`                    | 1     | plugin-client `credential list`                                                                                  |
| `halo.writeCredentials([...])`                       | 2     | plugin-client `credential add`; plugin-script (writes a `ServiceAccess` credential before deploy)                |
| `space.internal.getCredentials()`                    | 1     | plugin-client `credential list --space`                                                                          |
| `SpacesService.queryCredentials` (raw RPC)           | 1     | composer-app `util/halo.ts` `queryAllCredentials` — works around `queryCredentials` being sync/incomplete        |
| `IdentityService.createRecoveryCredential` (raw RPC) | 3     | plugin-client `create-recovery-code`, `create-passkey` operations                                                |
| `IdentityService.requestRecoveryChallenge` (raw RPC) | 1     | plugin-client `redeem-passkey` operation                                                                         |
| `IdentityService.recoverIdentity` (raw RPC)          | 2     | plugin-client `redeem-passkey`, `redeem-token` operations (proof/token variants not on the proxy)                |

The recovery/passkey flows reach past `client.halo` into raw RPC services because the proxy API
is incomplete — a clear signal for what the new service must cover as first-class verbs.

### 2.4 EDGE identity (credential presentation)

`createEdgeIdentity(client)` builds an `EdgeIdentity` whose `presentCredentials({ challenge })`
signs a nonce challenge with the device key — HALO's auth handshake toward EDGE.

| Consumer         | Site                                                                  |
| ---------------- | --------------------------------------------------------------------- |
| plugin-assistant | `edge-model-resolver` (AI service auth)                               |
| plugin-connector | `connector-coordinator` (EDGE websocket auth)                         |
| plugin-payments  | `services/edge-auth` (`Authorization: VerifiablePresentation` header) |
| plugin-client    | `useHubClient`, `edge status` command                                 |

### 2.5 Space management

Space CRUD/lifecycle — HALO-adjacent because membership and space keys are credential-backed:

| API                                                                    | Count | Consumers                                                                                                                                                                                                                                           |
| ---------------------------------------------------------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `client.spaces.get()` / `.get(id)`                                     | 57    | Ubiquitous space resolution: plugin-space, plugin-assistant, plugin-inbox, plugin-wnfs, plugin-search, plugin-thread, plugin-meeting, plugin-connector, plugin-discord/bluesky/slack sync, plugin-deck, plugin-simple-layout, composer-app recovery |
| `client.spaces.create(props?, options?)`                               | 34    | plugin-space `operations/create`, personal-space bootstrap (`identity-created`, `initializeIdentity`, `halo create` — with `tags`, `membershipPolicy`), plugin-native-filesystem mirror space, ~20 story fixtures                                   |
| `client.spaces.subscribe()`                                            | 8     | plugin-space (`spaces-ready` ×3, `save-tracker`, `JoinDialog`), plugin-client (`capabilities/client.ts`), plugin-routine (`trigger-runtime-controller`)                                                                                             |
| `client.spaces.join(code)`                                             | 1     | plugin-space `space join` command                                                                                                                                                                                                                   |
| `client.spaces.import(archive, opts?)`                                 | 4     | plugin-space `operations/import-space`, plugin-onboarding exemplar space, plugin-assistant snapshot testing                                                                                                                                         |
| `space.waitUntilReady()`                                               | ~20   | Everywhere a space is created/joined/opened                                                                                                                                                                                                         |
| `space.state.get()` / `SpaceState`                                     | 4     | plugin-doctor, plugin-space `react-surface`                                                                                                                                                                                                         |
| `useSpaces()` / `useSpace(id)`                                         | ~80   | plugin-space containers + story fixtures across ~25 plugins                                                                                                                                                                                         |
| `space.internal.export({ format })`                                    | 3     | plugin-space `operations/export-space`, onboarding/inbox scripts                                                                                                                                                                                    |
| `space.internal.migrate()` / `db.runMigrations`                        | 3     | plugin-space `operations/migrate`, `spaces-ready`; plugin-client `migrations`                                                                                                                                                                       |
| `space.internal.setEdgeReplicationPreference` / `data.edgeReplication` | 6     | plugin-space (`operations/create`, `spaces-ready`, sync-status UI), plugin-client `halo create`                                                                                                                                                     |
| `space.internal.db.saveStateChanged`                                   | 2     | plugin-space `save-tracker`                                                                                                                                                                                                                         |
| `AppSpace.*` (`@dxos/app-toolkit`)                                     | ~48   | `getPersonalSpace`, `getActiveSpace`, `isPersonalSpace`, tags — an existing app-level façade over `client.spaces`                                                                                                                                   |

Note: `space.db` / ECHO query APIs (the 268 `@dxos/react-client/echo` imports) are the ECHO
migration track (`Database` service in `@dxos/echo`), not HALO — they are out of scope here
except where noted.

### 2.6 Membership & presence

| API                                     | Count | Consumers                                                                                                                   |
| --------------------------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------- |
| `useMembers(spaceKey)`                  | 7     | plugin-space (`SpacePresence`, `SpaceHomeDashboard`), plugin-thread (Channel/Thread), plugin-comments, plugin-transcription |
| `SpaceMember` type / `PresenceState`    | 6     | plugin-space `members` command + presence UI, plugin-thread                                                                 |
| `member.presence`, `member.identity`    | 6     | Same                                                                                                                        |
| `SpaceMemberList` (`@dxos/shell/react`) | 2     | plugin-space `MembersContainer` (annotated `TODO: Copied from Shell`)                                                       |

No consumer calls role management (`updateMemberRole`) or member removal today — the UI simply
doesn't offer it. The new API should still define these verbs (Keyhive makes revocation
first-class).

### 2.7 Invitations

Device (HALO) invitations:

| API                            | Consumers                                                               |
| ------------------------------ | ----------------------------------------------------------------------- |
| `client.halo.share(opts?)`     | plugin-client `DevicesContainer` (QR + auth code), `halo share` command |
| `client.halo.join(invitation)` | plugin-client `halo join`, `account login` commands                     |

Space invitations:

| API                                                   | Consumers                                                                                                                                                        |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `space.share({ type, authMethod, multiUse, target })` | plugin-space `operations/share`, `operations/get-share-link` (delegated + known-public-key), `MembersContainer` (interactive + delegated), `space share` command |
| `client.spaces.join(code)`                            | plugin-space `space join` command                                                                                                                                |
| `useSpaceInvitations(spaceKey)`                       | plugin-space `MembersContainer`                                                                                                                                  |

Shared machinery:

| API                                                                                                         | Consumers                                                                              |
| ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `InvitationEncoder.encode/decode`                                                                           | 12 sites (plugin-client, plugin-space)                                                 |
| `Invitation.State` (state-machine polling)                                                                  | 20 sites — CLI `waitForState`, dialog state UIs                                        |
| `Invitation.Type` (`INTERACTIVE`/`DELEGATED`), `Invitation.AuthMethod` (`SHARED_SECRET`/`KNOWN_PUBLIC_KEY`) | plugin-space share/get-share-link, operation schemas (`Schema.Enums(Invitation.Type)`) |
| `CancellableInvitationObservable` / `AuthenticatingInvitationObservable`                                    | Devices/Members containers, CLI utils                                                  |
| `hostInvitation` helper                                                                                     | plugin-client `halo share`, plugin-space `space share`                                 |
| `InvitationResult`                                                                                          | Join dialogs (plugin-client, plugin-space)                                             |

### 2.8 Existing verb layer (key observation)

Composer already routes most HALO _mutations_ through `Operation` definitions rather than
calling the client ad hoc:

- `plugin-client` operations: `CreateIdentity`, `JoinIdentity`, `ShareIdentity`,
  `RecoverIdentity`, `CreateRecoveryCode`, `CreatePasskey`, `RedeemPasskey`, `RedeemToken`,
  `ResetStorage`, `CreateAgent`.
- `plugin-space` operations: `Create`, `Join`, `Share`, `GetShareLink`, `ImportSpace`,
  `ExportSpace`, `Migrate`, `Rename`, `OpenMembers`, …

The operation _handlers_ are where `client.*` calls concentrate. What is **not** funneled:
reads and subscriptions (`identity.get()`, `useIdentity`, `useSpaces`, `useMembers`,
`spaces.subscribe`), invitation observables, types/enums, and the raw-RPC escape hatches
(§2.3). Replacing the client dependency therefore mostly means giving the handlers, hooks, and
types a new home — not redesigning plugin control flow.

### 2.9 Out of scope

- `plugin-devtools` — deliberately introspects the whole client stack; migrates last (or stays
  on `@dxos/client` as a diagnostic tool).
- `SystemService.reset`, `client.diagnostics()` — client lifecycle, not HALO.
- ECHO database APIs (`space.db`, `useQuery`, …) — separate `@dxos/echo` Database service track.
- `plugin-observability` identity provider — reads raw services for telemetry; follows once the
  services exist.

## 3. Evaluation: replacing the surface with `@dxos/halo` services

### 3.1 Shape

**`@dxos/halo` holds definitions only — no implementations.** The package exports service tags
(`Context.Tag`), their interfaces, verb functions (module-level `Effect`s that consume the tag),
and the Effect schemas for the domain types. Every concrete backing — the client adapter, the
Keyhive/EDGE layers, any in-memory test double — lives in a **separate implementation package**
and is provided as a `Layer` at composition time. This keeps `@dxos/halo` free of `@dxos/client`
(and of `keyhive_wasm`) and makes the backend a layer swap. (The Keyhive membership prototype has
been removed from this package to honor this rule; a future `@dxos/halo-keyhive` will host that
runtime — see §3.5.)

Three services (`Context.Tag`s), one per aspect:

- **`Invitation`** — purely the invitation _lifecycle_: the flow handle, its event stream,
  authenticate/cancel, encode/decode, and observing active invitations. It does **not** know how
  to _start_ an invitation against an identity or a space.
- **`Identity`** — identity & device management, **plus** device-invitation _initiation_
  (`share`/`join`). Depends on `Invitation` (returns/consumes its `Flow`).
- **`Space`** — space management & membership, **plus** space-invitation _initiation_
  (`share`/`join`). Depends on `Invitation`.

```text
        Identity ─────┐
                      ├──▶ Invitation      (Invitation depends on neither)
        Space ────────┘
```

```ts
import { Effect } from 'effect';
import { Identity, Invitation, Space } from '@dxos/halo';

// Initiation lives on Identity/Space; the returned flow is an Invitation.Flow:
const program = Effect.gen(function* () {
  const flow = yield* Space.share(space.id); // Space.Service → Invitation.Flow
  yield* Invitation.authenticate(flow, code); // Invitation.Service manages the lifecycle
});
```

The split matches the audit: identity/device consumers (§2.1–2.4) rarely touch spaces;
space-resolution consumers (§2.5–2.6) rarely touch identity; the invitation _lifecycle_ (§2.7) is
a self-contained state-machine world. Putting _initiation_ on `Identity`/`Space` means a consumer
that only shares a space depends on `Space` (+ `Invitation`) without pulling in identity, while
`Invitation` stays a leaf dependency reusable by both.

Reactivity: the current API mixes `MulticastObservable`, callbacks, and React hooks. The
services expose each reactive read as an `Effect` (snapshot) plus a `Stream`/`Atom` (changes)
— plugin-client already bridges to atoms via `CreateAtom.fromObservable`, and the app graph is
atom-based, so `Atom` is the natural currency for the React layer.

### 3.2 `Identity.Service` — identity & device management

| Verb                                                        | Replaces                                                                                                        |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `Identity.current` → `Option<Profile>`                      | `halo.identity.get()`                                                                                           |
| `Identity.changes` → `Stream<Option<Profile>>`              | `halo.identity.subscribe()`, `useIdentity`                                                                      |
| `Identity.create(profile?)`                                 | `halo.createIdentity()`                                                                                         |
| `Identity.updateProfile(profile)`                           | `halo.updateProfile()`                                                                                          |
| `Identity.recover({ code \| token \| proof })`              | `halo.recoverIdentity()` + raw `IdentityService.recoverIdentity` (§2.3)                                         |
| `Identity.createRecoveryKey({ key, algorithm, lookupKey })` | raw `IdentityService.createRecoveryCredential` (recovery code + passkey)                                        |
| `Identity.requestRecoveryChallenge()`                       | raw `IdentityService.requestRecoveryChallenge`                                                                  |
| `Identity.devices` / `Identity.deviceChanges`               | `halo.devices`, `useDevices`                                                                                    |
| `Identity.localDevice`                                      | `halo.device`                                                                                                   |
| `Identity.updateDevice(profile)`                            | raw `DevicesService.updateDevice`                                                                               |
| `Identity.attest({ challenge, audience? })`                 | `createEdgeIdentity(client).presentCredentials()` (§2.4) — signed, audience-bound message per MIGRATION.md §5.1 |
| `Identity.share(opts?)` → `Invitation.Flow`                 | `client.halo.share()` — device-invitation initiation (delegates the lifecycle to `Invitation`)                  |
| `Identity.join(code)` → `Invitation.Flow`                   | `client.halo.join()` — device/account join                                                                      |

Types: device kind and the identity profile fields are inlined into `Identity` (`DeviceKind`,
`DeviceInfo`, `Info`) rather than living in separate schema modules. The legacy `Identity` proxy
type (`did`, `identityKey`, `spaceKey`, `profile`) collapses into `Info` = `{ did, displayName? }`
— `spaceKey` consumers (composer-app `queryAllCredentials`, plugin-onboarding `util.ts`) are
credential plumbing, deferred with the credential verbs below.

The table above is the full target surface. The **first shipped cut** (this PR) implements the
common path — `current`/`changes`, `create`, `recover`, `updateProfile`, `devices`/`deviceChanges`,
`share`/`join`. The remaining verbs are **deferred** to keep the package definitions-only and
lean: `createRecoveryKey` / `requestRecoveryChallenge`, `localDevice` / `updateDevice`, `attest`,
and the transitional `credentials` / `writeCredential` pair. Credentials in particular dissolve
into Keyhive membership ops and would drag the protobuf `Credential` type into this
definitions-only package, so recovery/credential flows stay on the raw `IdentityService` until
that type is modeled here. The plugin-script `ServiceAccess` credential should become an explicit
capability-grant verb when the EDGE shim lands.

### 3.3 `Space.Service` — space management & membership

| Verb                                                                            | Replaces                                                                                                                                   |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `Space.spaces` / `Space.changes`                                                | `client.spaces.get()`, `client.spaces.subscribe()`, `useSpaces`                                                                            |
| `Space.get(id)` → `Option<Space>`                                               | `client.spaces.get(id)`, `useSpace(id)`                                                                                                    |
| `Space.create(props?, { tags?, membershipPolicy? })`                            | `client.spaces.create()`                                                                                                                   |
| `Space.waitReady(id)` (or `Space.state(id): Stream`)                            | `space.waitUntilReady()`, `space.state.get()`, `SpaceState`                                                                                |
| `Space.update(id, { name, icon, hue, tags })`                                   | direct property writes (plugin-space rename)                                                                                               |
| `Space.members(id)` / `Space.memberChanges(id)`                                 | `useMembers`, `SpaceMember` reads                                                                                                          |
| `Space.updateMemberRole(id, subject, role)` / `Space.removeMember(id, subject)` | Keyhive delegation/revocation (no current consumer). Shipped: adapter maps to `space.updateMemberRole` (member resolved by DID)            |
| `Space.export(id, { format })` / `Space.import(archive, opts?)`                 | `space.internal.export()`, `client.spaces.import()`                                                                                        |
| `Space.migrate(id)`                                                             | `space.internal.migrate()`, `db.runMigrations`                                                                                             |
| `Space.setReplication(id, setting)` / `Space.replication(id)`                   | `space.internal.setEdgeReplicationPreference`, `data.edgeReplication` (becomes "delegate `pull` to EDGE" under Keyhive, MIGRATION.md §5.1) |
| `Space.share(id, { type, authMethod, multiUse, target })` → `Invitation.Flow`   | `space.share()` — space-invitation initiation (delegates the lifecycle to `Invitation`)                                                    |
| `Space.join(code)` → `Invitation.Flow`                                          | `client.spaces.join()`                                                                                                                     |

The returned `Space` value is a plain data snapshot (id, state, properties, tags) — **not** a
live proxy owning `db`. Database access stays on the `@dxos/echo` `Database` service keyed by
`SpaceId`, which decouples the two migrations. `AppSpace` (`@dxos/app-toolkit`) keeps its role
as the app-level façade (personal space, active space) but re-implements over `Space.Service`,
which converts its ~48 call sites for free.

Roles map forward to Keyhive `Access` (`read`/`edit`/`admin`/`pull`) per MIGRATION.md §3;
member `presence` is not credential data and should move to a presence/network concern rather
than ride on `SpaceMember`.

### 3.4 `Invitation.Service` — invitation lifecycle

Purely the mechanics of an in-flight invitation. It does **not** initiate invitations — that is
`Identity.share`/`Identity.join` (§3.2) and `Space.share`/`Space.join` (§3.3), which construct
and return an `Invitation.Flow` this service then drives. `Invitation` depends on neither
`Identity` nor `Space`.

| Verb / type                                                                       | Replaces                                                                                                                   |
| --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `Invitation.Flow`: `{ events: Stream<InvitationEvent>; id }`                      | `CancellableInvitationObservable`, `AuthenticatingInvitationObservable` (the object `Identity`/`Space` initiation returns) |
| `Invitation.authenticate(flow, code)`                                             | `observable.authenticate()` / `Invitation.State` polling                                                                   |
| `Invitation.cancel(flow)`                                                         | `observable.cancel()`                                                                                                      |
| `Invitation.events(flow)` → `Stream<InvitationEvent>`                             | `Invitation.State` polling, `hostInvitation`/`waitForState` helpers                                                        |
| `Invitation.active(scope?)` / changes                                             | `useSpaceInvitations`                                                                                                      |
| `Invitation.encode(invitation)` / `Invitation.decode(code)` (pure)                | `InvitationEncoder`                                                                                                        |
| Schemas: `InvitationKind`, `AuthMethod`, `Type`, `InvitationEvent` (tagged union) | `Invitation.State/Type/AuthMethod` protobuf enums (also used in operation schemas via `Schema.Enums`)                      |

Modeling the flow as a `Stream` of tagged events (`connecting` → `readyForAuth(authCode?)` →
`success(result)` | `cancelled` | `error`) removes every `state >= Invitation.State.X`
comparison in the dialogs and the CLI's hand-rolled `waitForState`. Under Keyhive the lifecycle
is unchanged — only what `Identity`/`Space` initiation does behind the flow differs: `share`
mints an ephemeral invitation key or prekey delegation; `join`/`accept` becomes contact-card
exchange + delegation (MIGRATION.md §4.6). Keeping the lifecycle in one leaf service lets both
initiation paths and every dialog/CLI consumer share exactly one state machine.

### 3.5 Layering & migration mechanics

`@dxos/halo` is **definitions only** (tags, verbs, schemas); implementations are separate
packages provided as `Layer`s at one composition root — today `plugin-client`, which already
owns client construction. Plugins import only `@dxos/halo`:

```text
@dxos/halo            Identity.Service / Space.Service / Invitation.Service   (tags + verbs + schemas, NO impl)
   ▲                        ▲
   │                        │  provide layers at composition:
   │                        │
@dxos/halo-adapter-client ── layerClient(client)               (wraps HaloProxy/EchoProxy/InvitationsProxy)
@dxos/halo-keyhive  ──  layerKeyhive / layerEdge  (future)     (Keyhive prototype impl relocates here, MIGRATION.md §A.2)
   ▲
   │
plugin-client  ──────  composition root; sole remaining importer of @dxos/client
```

`layerClient` (in `@dxos/halo-adapter-client`) wraps the existing proxies (`HaloProxy`,
`EchoProxy` spaces, `InvitationsProxy`) — a mechanical adapter, no behavior change. Later,
`layerKeyhive` (or the EDGE-endpoint shim) replaces it without touching a single plugin. Because
`@dxos/halo` carries no implementation, this is a pure layer swap; the Keyhive membership runtime
will live in a future `@dxos/halo-keyhive`, not in `@dxos/halo`.

Suggested sequence:

1. **Define services** in `@dxos/halo` (tags, verbs, event/error schemas — no layers). Inline the
   value types each service needs (`DeviceKind`/`Info`, `Access`/`Member`, `InvitationEvent`,
   `Invitation.Flow`) rather than shipping separate schema modules. Keep the Keyhive membership
   runtime out of `@dxos/halo` (destined for `@dxos/halo-keyhive`).
2. **`layerClient`** in a `@dxos/halo-adapter-client` package (keeps `@dxos/halo` free of the
   client dependency), provided by `plugin-client` alongside — then instead of —
   `ClientCapabilities.Client`. **(Implemented — see `@dxos/halo-adapter-client`, with an
   integration suite in `@dxos/halo-e2e`.)**
3. **Port operation handlers** (§2.8) — the concentrated mutation sites — from `client.*` to
   service verbs. Plugin control flow (operations) is unchanged.
4. **Port hooks**: reimplement `useIdentity`/`useDevices`/`useSpaces`/`useSpace`/`useMembers`/
   `useSpaceInvitations`/`useCredentials` over the services' atoms (in `@dxos/halo-react` or
   `app-toolkit`), then mass-update imports. `AppSpace` converts in the same step.
5. **Port dialogs/CLI** off invitation observables onto flow streams; delete `waitForState`
   and the copied Shell components' state plumbing.
6. **Stories & testing**: replace `client.halo.createIdentity()` + `client.spaces.create()`
   fixtures (~30 sites) with `Identity.create`/`Space.create` over an in-memory test layer —
   stories stop needing a full `Client` at all, currently the single largest source of
   incidental `@dxos/client` imports.
7. **Sweep types**: `Identity`/`Device`/`SpaceMember`/`Credential`/`Invitation` type imports →
   `@dxos/halo` schemas. At this point `@dxos/client` remains only inside `plugin-client`'s
   composition root and `plugin-devtools`.

### 3.6 Gaps & open questions

1. **`Credential` surface** — `RecoveryCredentialsContainer` and the `credential` CLI render
   raw credentials. Transitional verbs (§3.2) cover it, but the rendering will need a schema
   change when credentials become Keyhive membership ops. Acceptable: the container is
   diagnostic UI.
2. **`space.internal.db.*`** (`saveStateChanged`, `runMigrations`) — database concerns reached
   through the space proxy; they belong to the ECHO `Database` service track and should be
   excluded from `Space.Service` rather than ported.
3. **Presence** — `SpaceMember.presence` conflates membership (HALO) with liveness (MESH).
   Proposal: `Space.members` returns membership only; presence moves to a separate
   stream/service so the Keyhive backend isn't forced to fake it.
4. **`PublicKey` vs DID** — consumers compare `identityKey`/`spaceKey` (`PublicKey`). New
   schemas should standardize on DID / `SpaceId` strings (per this package's types); the
   adapter translates during the transition.
5. **Enums in operation schemas** — `Schema.Enums(Invitation.Type)` leaks protobuf enums into
   operation contracts (`plugin-space/operations/definitions.ts`); these need parallel Effect
   schema literals and a coordinated cut-over.
6. **Shell UI components** — `SpaceMemberList`/`InvitationList`/`AuthCode` from
   `@dxos/shell/react` embed observable-based logic; they should be rebuilt on the new hooks in
   `react-ui-*` (the `MembersContainer` TODO already wants this).
7. **Definitions-only invariant** — `@dxos/halo` must not gain a runtime dependency. The Keyhive
   membership prototype (`make`/`layerMemory`) has been removed for this reason and will live in
   `@dxos/halo-keyhive` (§3.5); a lint/dep-cruiser rule should keep `@dxos/halo` from importing
   anything but schema and type primitives so no future layer sneaks back in.
