# @dxos/plugin-client

## 0.12.0

### Minor Changes

- 85ad256: `dx account invitation create` issues an invitation code against the logged-in account's own quota. The hub no longer exempts any address from its invitation gate, so a code is the only way to create an account from the CLI — redeem one with `dx account signup <CODE>`.
- 2d4107f: Add `dx account signup <code>`, which validates an access code and then signs up with either email or an Atmosphere (atproto) OAuth account, mirroring Composer's sign-up flow. This replaces `dx account login --code`, which is removed — `login` recovers an existing account again, and account creation lives in `signup`. The `--method` name for the atproto OAuth path is now `atmosphere` in both commands, matching Composer's wording; `--method atproto` is still accepted as an alias.

  The sign-up flows themselves move to `@dxos/app-toolkit/Account`, shared by Composer's welcome screen, the OAuth redirect finalizer, and the CLI: the pre-signup email probe, access-code validation and redemption, and OAuth registration completion are one implementation with typed errors (`EmailAlreadyRegisteredError`, `EmailProbeUnavailableError`, `AccountRedemptionError`). Supporting moves: the `Connection` type joins `AccessToken` and `Cursor` in `@dxos/link` (no longer exported from `@dxos/plugin-connector`), `ATMOSPHERE_SOURCE` joins `OAuthProvider` in `@dxos/protocols`, and the Atmosphere connector is identified by `OAuthProvider.ATPROTO` as its `Connector.id` (`ATMOSPHERE_PROVIDER_ID` is gone; the label is unchanged). Connections created before this carry `connectorId: 'atmosphere'` and no longer resolve to a registered connector — token refresh and source lookups are unaffected, but re-auth and per-connector actions need `connectorId` set to `'atproto'`. `LoginResponse.token` is also removed: no login path ever returned a recovery token inline (the magic link always goes out by email), so the field and its unreachable consumer branches are dropped.

  Two fixes on the OAuth path: the CLI's OAuth round-trip now normalizes the configured edge URL to `http(s)` before calling `/oauth/initiate` (`fetch` rejects the `wss://` form that client configs carry, which broke `--method atmosphere` for both `signup` and `login`), and `getEdgeUrlWithProtocol` is exported from `@dxos/edge-client` so that normalization is shared rather than re-derived. `dx account signup` no longer prints `accountId` alongside `identityDid` — the hub keys accounts by identity DID, so the two were always the same value under two names.

- 7becabf: Finish `dx account login` from the browser, for both email and passkey.

  `--method email` previously dead-ended: the emailed link redirected to `APP_URL`, so a CLI login left you digging the token out of a URL bar. The command now starts a local callback server before asking the hub for a link and advertises it as the `redirectUrl`, so the hub's activation route returns the browser to the CLI instead of to a web app that may not be running. Clicking the link is the whole flow -- the token prompt is gone, since a link that only ever redirects to loopback cannot be completed anywhere else. A host that cannot bind a port now fails with that reason instead of asking for a paste.

  `--method passkey` is new. The prompt runs on a hub-served page rather than in the CLI, because WebAuthn scopes a credential to a relying party and a page served from a loopback port can only ever name `localhost` -- a `composer.space` passkey is never offered to one. The CLI opens the hub's `/auth/verify?purpose=device` with its loopback origin as the callback and waits; the hub verifies the assertion, shows which identity signed, and on approval mints the same login token the emailed link mints. Both methods now end in the same `recoverIdentity({ token })` call, and no assertion reaches this process.

  What keeps a link to that page from authorizing a stranger's terminal is the callback rule: the token is only ever delivered to a loopback origin, so a phished approval lands on the victim's own machine. Neither method works over SSH for the same reason -- a browser on another machine has nowhere to return to, which is what device invitations are for.

  The shared callback server moved from `@dxos/cli-util/oauth` to `@dxos/cli-util/callback` and is now named `startLocalCallbackServer` -- it is no longer OAuth-only. `OAUTH_TIMEOUT_MS` is `CALLBACK_TIMEOUT_MS` there, and it takes an optional `successMessage` for the page the browser lands on. `LoginRequestSchema` gains `redirectUrl`, which hub-service already accepted.

- 73daef4: Send `dx account login --method passkey` to the auth origin rather than the hub's API host.

  A passkey is bound to the WebAuthn relying party it was registered against, and Composer pins that to `composer.space` rather than the page host, so only an origin under that domain can present one. The hub answers on its API host as well, where the prompt renders, returns 200, and then fails in the browser with `SecurityError` and nothing else to go on. MCP avoided this by pinning `DX_AUTH_BASE_URL` to a blessed hostname, an unwritten constraint each new caller had to rediscover.

  `Runtime.Services.Hub` gains `auth_url`, resolved by `Account.getAuthUrl` the same way `url` is resolved by `getHubUrl`: `DX_AUTH_URL`, then `runtime.services.hub.authUrl`, then `DEFAULT_AUTH_URL` (`https://account.composer.space`). The `dev` and `local` CLI profiles set it to the dev hub's own serving origin.

- fee7666: Rename the device storage reset to "Log out" and move the join-existing-identity and recovery-code resets into their own section behind the new `identityTestActions` option on `ClientPlugin` (off by default). The account, invitations, and usage panels are hidden when no hub URL is configured.
- 0ef896f: Completes the HALO consumer-migration surface: no plugin reaches for `@dxos/client` to do HALO work anymore.

  - **`useInvitationFlow(flow)`** (`@dxos/halo-react`) renders any `Invitation.Flow` — its latest lifecycle event plus the shareable code — replacing a subscription to the client's `CancellableInvitationObservable`. The code is re-emitted with each event so a rendered QR and the flow state cannot tear.
  - **`Identity.DeviceInfo` gained `presence`, `os`, `platform`, and a populated `kind`**, which is what a device list needs to show status, name, and icon. `@dxos/shell`'s `DeviceListItem` now accepts the structural `ShellDevice` that `DeviceInfo` satisfies, so a HALO-backed caller renders it directly; shell's own client-backed `DeviceList` maps through the newly exported `toShellDevice`.
  - **`ClientOperation.GrantServiceAccess`** (`{ serverName, capabilities }`) wraps the existing `Identity.grantServiceAccess` verb so a component can grant EDGE/Hub access without the client's credential-write surface.
  - **`Identity.atom(service)`** is an `Atom<Option<Info>>` for reactive non-React consumers (app-graph builders), seeded from `getSnapshot()` and updated through `subscribe()`, keyed by service reference.

  plugin-client's `DevicesContainer` and app-graph-builder, and plugin-script's settings surface, use these. `DevicesContainer` keeps `useClient`/`useNetworkStatus` only for swarm status and the `DX_ENVIRONMENT` log gate — config and mesh access, not identity.

- 48fd9fe: `@dxos/halo`'s `Identity` service gained the verbs consumers needed to leave `@dxos/client` behind for identity recovery and personal-space lookup.

  - `Identity.personalSpaceId` returns `Option<SpaceId>` for the identity's HALO space, replacing `client.halo.identity.get()?.spaceKey` plus a manual `createIdFromSpaceKey`. It is a verb rather than a field on `Identity.Info` because the id comes from an async digest of the identity key.
  - `Identity.createRecoveryCredential()` mints a recovery code; `Identity.createRecoveryCredential({ externalKey })` registers an externally held key (a passkey) with an optional label and kind. `Identity.revokeRecoveryCredential(lookupKey)` revokes one by its hex lookup key, and `Identity.requestRecoveryChallenge` returns the challenge a recovery key must sign. The WebAuthn ceremony stays at the call site; only the credential write moved into HALO.
  - `Identity.recover` accepts a `passkey` variant carrying a WebAuthn assertion over a challenge, alongside the existing recovery-code, token, and recovery-proof forms.
  - `Identity.create` accepts `data`, so profile metadata set at creation is no longer dropped.

  `Halo.recoverIdentity` in `@dxos/client-protocol` now takes `RecoverIdentityArgs`, which adds the `external` (passkey assertion) variant. Passkey login therefore goes through the HALO proxy — which emits `identityChanged` — instead of the raw `IdentityService` RPC.

  `plugin-client`'s `create-identity`, `create-recovery-code`, `create-passkey`, `redeem-passkey`, `redeem-token`, and `revoke-recovery-credential` operations use these verbs and no longer reach for the client or its services.

- ca34a80: Added `Migration.defineRename({ from, to })` for migrating references to a renamed named entity (e.g. an operation key). Applying it rewrites the `dxn:` references held in the space's object data, preserving each reference's version suffix; a reference that already reads correctly is not written, so a re-run — or a peer that already replicated the result — is a no-op. Queue and feed contents are not indexed for reverse lookup and are not migrated.

  Migration definitions now carry `Migration.TypeId` and a `kind` discriminant: `Migration.ObjectMigration` (from `Migration.define`) and `Migration.RenameMigration` (from `Migration.defineRename`) both extend the `Migration.Migration` base, narrowed with `Migration.isObjectMigration` / `Migration.isRenameMigration`; `Migration.isMigration` guards an unknown value. `EchoDatabase.runMigrations` accepts both kinds and rejects an unrecognized one before applying any of the batch.

  `Query.select(Filter.key(dxn)).referencedBy()` now finds the objects referencing a named entity. The reverse-reference index covers `dxn:` targets — previously it indexed only `echo:` entity ids — keyed by the unversioned NSID, so one lookup finds every version of a name; existing databases re-index the reverse-reference table once on open to pick up the newly covered references. The planner collapses that construct to a single index lookup, because a named entity is never in the graph and so can never be selected as a traversal anchor. A version-constrained `Filter.key(dxn, { version })` anchor keeps its existing composed meaning, since the index cannot honour a semver range.

- 61fe676: Defer activation events dispatched while startup is running until the startup wave completes, so a module activating on one can rely on every startup capability being present. Keep the composed React context stable across renders so a capability change no longer remounts the application. Add a `client` option to the client plugin, letting a host construct and begin initializing the client before the activation pass reaches the plugin.
- 9e91762: Recovery credentials can be labelled, told apart by kind, and revoked from Composer.

  `dxos.halo.credentials.IdentityRecovery` gains `label` and `kind` (`PASSKEY`, `RECOVERY_CODE`, `OAUTH`), so a management surface can distinguish a passkey from a recovery code rather than showing a column of identical dates. Both are set at creation: the passkey flow derives a default label from the platform, the recovery-code flow labels itself.

  A new `dxos.halo.credentials.IdentityRecoveryRevoked` assertion cancels a recovery credential. It is written to the identity's own control feed, mirroring how `SpaceDeleted` tombstones a space — the feed is append-only, so the original credential stays and the revocation marks it spent, and it replicates to the user's other devices. `IdentityService.revokeRecoveryCredential` writes it and refuses the last un-revoked credential.

  `Identity.Credential` gains an optional `recovery` field (`lookupKey`, `label`, `kind`, `revoked`) so consumers of the public HALO view can render and revoke without reaching into protobuf assertions.

### Patch Changes

- c56ba34: CLI commands no longer fail with `Client not initialized` against a profile that already holds an identity. `client.initialize()` is forked off startup so the app's boot waterfall is not blocked, but a CLI command body runs straight through and reached `client.halo` before the fork landed — `dx halo identity`, `dx device list`, `dx halo keys` and `dx device info` failed outright, and `dx account login` reported a missing client instead of its "Already logged in" guard.

  `ClientPlugin` gains `awaitInitialization` (default `false`), which gates the contributed `ClientService` on initialization. The CLI opts in; the app keeps the forked, non-blocking behaviour.

- 069e8ed: Give the CLI's `main` profile template full parity with Composer's local dev config (edge, ICE, sandbox, IPFS), and auto-default new profiles to it when running the CLI from a monorepo checkout via `DX_LOCAL_DEV`.
- dbff1e4: Register the app's schema migrations from `@dxos/app-toolkit/AppMigrations` so every host stamps a newly created default space as already migrated. `dx account signup` now drains all of an identity's spaces to EDGE concurrently before exiting, and `dx space sync` does the same when given no space id. Removed `dx halo create`, which minted a local identity with no Account behind it — use `dx account signup` or `dx account login`.
- 3ee20ca: Fix drag-and-drop losing an item, and restore the authentication code on device invitations. Reordering within a board column destroyed the dragged item and moving a kanban card to the uncategorized column did nothing, because both re-entered the ECHO array or property in a form its schema rejects after the removal had already committed. Adding a device asked the identity service to share with its default auth method, which is no authentication, so the host was never issued a code to read out and the panel fell back to showing only the QR code — leaving the invitation code as the sole factor.
- 3e02201: Default service URLs follow the EDGE environment rename (DX-1150): the config preset and CLI profile
  templates gain `preview` (with `main` preserved as a deprecated alias of the same worker), the default
  edge URL moves to `https://preview.dxos.network`, and the Image/Introspect service defaults become the
  production hostnames (`image.dxos.network`, `introspect.dxos.network/mcp`), including
  `@dxos/edge-client`'s `DEFAULT_IMAGE_SERVICE_URL` (the retired `image-service-main` workers.dev
  name no longer resolves).
- 9477170: Wait for the client to finish initializing before providing `ClientService` to the Effect layer graph, so layers built during boot no longer fail with `Client not initialized.`
- 48ea128: Resolve the hub URL outside the browser: `DX_HUB_URL` and other `DX_*` environment variables now
  apply to node config loads, `runtime.services.hub.url` and a built-in default back up
  `runtime.app.env.DX_HUB_URL`, and `dx account` commands no longer fail with "Hub URL not
  configured".
- cc45381: Pin the WebAuthn relying party to `composer.space` for deployed builds so recovery passkeys created at labs/staging are accepted by the hub. Existing passkeys created at `labs.composer.space` are orphaned and must be re-created.
- df0ab57: Fix remote (EDGE) sync progress never reaching progress meters — the swarm trace monitor and the progress registry now activate at startup, so the process monitor's remote trace source and the registry exist before anything subscribes — and add a Swarm announcements panel to devtools stats for inspecting the raw swarm trace broadcasts that progress rides on.
- 256f286: Projects gain a lifecycle `status` field (`active | paused | blocked | ended`), surfaced through the MCP-projected verbs, and plugin-projects ships a project-management skill for external agents — including the `/codeProject setup` flow that binds a repo to an existing space. The skill's key segment is `codeProject` because the segment doubles as the projected MCP prompt name and plain `project` belongs to assistant-toolkit's own skill.

  `toEffectSchema` recognizes ECHO's reference sentinel before the generic `type: 'object'` branch, so a reference node widened with structural keywords (as a wire boundary may do for schema-unaware consumers) decodes as a reference instead of a plain struct. Serialization is unchanged — persisted schemas stay byte-identical to previous releases.

  Worker (`workerd`) bundles no longer pull in React. Wrangler resolves `workerd, worker, browser` and never `node`, so a `#capabilities` map offering only `node` and `default` handed workers the browser barrel and its React surfaces. Every plugin with a headless entry now resolves a server-safe barrel under a `workerd` condition, and the `check-module-structure` guards trace with `workerd,worker` — the conditions a worker actually resolves — so a reintroduced leak fails the check instead of passing against a build that is never shipped.

- 318bbad: Register contributed schema before first-run consumers create typed objects. `SchemaDefs` now
  contributes a `ClientCapabilities.SchemaRegistered` marker that modules writing typed objects on
  `IdentityCreated` can require, and `ManagerOptions`/`TestAppOptions` accept a `whenIdle` effect so a
  test can model a host that has not gone idle yet.
- e288833: The space replication progress meter now labels itself `Syncing <space name>` instead of showing the space name alone, matching the mail sync meter's phase-first style.
- 63629c5: Fixed the sync progress indicator getting stuck showing "sync in progress" after replication had caught up, and collapsed a space's CRDT and feed backlogs into a single progress item.

  - `subscribeToSyncState` now re-establishes the feed sync-state stream after a reconnect (leader change) and clears the feed backlog while it is down — previously the stream died silently and every later document update re-published the last (non-zero) feed counts forever.
  - The space replication progress capability no longer stacks a subscription fiber per space on every spaces-subscription delivery (duplicate writers raced over one monitor key), drops the monitor for a space that leaves the list, and reconciles against a fresh `getSyncState` read every 10s so a missed update cannot outlive the backlog.
  - Documents and feed blocks now share one monitor per space; the breakdown (`4 CRDTs · ↓6 ↑2`) is rendered as the meter's note, which `ProgressMeter` previously ignored.

- Updated dependencies [0280a6a]
- Updated dependencies [9477170]
- Updated dependencies [86d1482]
- Updated dependencies [af1c007]
- Updated dependencies [106d38a]
- Updated dependencies [e2eecf2]
- Updated dependencies [2800d03]
- Updated dependencies [96f94c2]
- Updated dependencies [592b00e]
- Updated dependencies [6d52561]
- Updated dependencies [e954c0f]
- Updated dependencies [9ef5485]
- Updated dependencies [22bea85]
- Updated dependencies [b4ceea2]
- Updated dependencies [bdb02cd]
- Updated dependencies [48eb05d]
- Updated dependencies [4a0b78b]
- Updated dependencies [34a8433]
- Updated dependencies [0fe00c5]
- Updated dependencies [b8762ef]
- Updated dependencies [2d4107f]
- Updated dependencies [069e8ed]
- Updated dependencies [7becabf]
- Updated dependencies [73daef4]
- Updated dependencies [75971ad]
- Updated dependencies [3958355]
- Updated dependencies [b4c7782]
- Updated dependencies [4e417e9]
- Updated dependencies [d194929]
- Updated dependencies [557e243]
- Updated dependencies [ea11703]
- Updated dependencies [5305365]
- Updated dependencies [c01fef6]
- Updated dependencies [a09e18e]
- Updated dependencies [a3d45c4]
- Updated dependencies [881f900]
- Updated dependencies [6d28380]
- Updated dependencies [da37a13]
- Updated dependencies [0a01ff7]
- Updated dependencies [1c995c4]
- Updated dependencies [7575cb6]
- Updated dependencies [2c5aaf0]
- Updated dependencies [a69d861]
- Updated dependencies [ba08e65]
- Updated dependencies [dbff1e4]
- Updated dependencies [5fcd238]
- Updated dependencies [5e8878c]
- Updated dependencies [ed9aeba]
- Updated dependencies [e094f74]
- Updated dependencies [23d2d8c]
- Updated dependencies [b0953f0]
- Updated dependencies [375b863]
- Updated dependencies [6c6987e]
- Updated dependencies [3e02201]
- Updated dependencies [261c821]
- Updated dependencies [ed43a8d]
- Updated dependencies [dde6714]
- Updated dependencies [a3b6ef0]
- Updated dependencies [b02fe16]
- Updated dependencies [c439ba0]
- Updated dependencies [6af130f]
- Updated dependencies [2c442f9]
- Updated dependencies [2922d36]
- Updated dependencies [d62a947]
- Updated dependencies [7d000b9]
- Updated dependencies [e56276b]
- Updated dependencies [cafa240]
- Updated dependencies [813069c]
- Updated dependencies [4c107a2]
- Updated dependencies [b9d72bb]
- Updated dependencies [0ef896f]
- Updated dependencies [777d24a]
- Updated dependencies [48fd9fe]
- Updated dependencies [3e9a10f]
- Updated dependencies [8ea2bf9]
- Updated dependencies [5ceaf9c]
- Updated dependencies [48ea128]
- Updated dependencies [8ca2ac7]
- Updated dependencies [2c06e2e]
- Updated dependencies [098a0bb]
- Updated dependencies [0132aab]
- Updated dependencies [a74e9b0]
- Updated dependencies [47c8d7e]
- Updated dependencies [ca4429a]
- Updated dependencies [10b1239]
- Updated dependencies [9c86066]
- Updated dependencies [5180720]
- Updated dependencies [b600f72]
- Updated dependencies [99e323d]
- Updated dependencies [ea11703]
- Updated dependencies [bf4f1e6]
- Updated dependencies [cc45381]
- Updated dependencies [bcfe4c5]
- Updated dependencies [6328de3]
- Updated dependencies [ebb8f4a]
- Updated dependencies [557e243]
- Updated dependencies [ca34a80]
- Updated dependencies [29543ca]
- Updated dependencies [e26af7e]
- Updated dependencies [ab79741]
- Updated dependencies [c0e5651]
- Updated dependencies [3214dcf]
- Updated dependencies [24fcadc]
- Updated dependencies [77a2d34]
- Updated dependencies [5ae704b]
- Updated dependencies [4804da0]
- Updated dependencies [61fe676]
- Updated dependencies [d4b4919]
- Updated dependencies [63e500b]
- Updated dependencies [7c426d4]
- Updated dependencies [02fe893]
- Updated dependencies [19f19a2]
- Updated dependencies [987f7e1]
- Updated dependencies [a09e18e]
- Updated dependencies [1ab4bb8]
- Updated dependencies [a78a66d]
- Updated dependencies [fc8c80c]
- Updated dependencies [32468c3]
- Updated dependencies [0a3e9dd]
- Updated dependencies [256f286]
- Updated dependencies [4689d66]
- Updated dependencies [306f50d]
- Updated dependencies [e207c68]
- Updated dependencies [5b504b4]
- Updated dependencies [d7b0a3b]
- Updated dependencies [1482a3f]
- Updated dependencies [4663f24]
- Updated dependencies [2513a52]
- Updated dependencies [2896a58]
- Updated dependencies [1d6f730]
- Updated dependencies [b125655]
- Updated dependencies [10defed]
- Updated dependencies [9e91762]
- Updated dependencies [f4c2702]
- Updated dependencies [dea5df9]
- Updated dependencies [318bbad]
- Updated dependencies [fc83abd]
- Updated dependencies [efa7836]
- Updated dependencies [678ba58]
- Updated dependencies [8904184]
- Updated dependencies [e680b16]
- Updated dependencies [a805212]
- Updated dependencies [631ade3]
- Updated dependencies [f8bfba0]
- Updated dependencies [ea11703]
- Updated dependencies [886453b]
- Updated dependencies [0280a6a]
- Updated dependencies [18597fc]
- Updated dependencies [63629c5]
- Updated dependencies [881f900]
- Updated dependencies [0c92b44]
- Updated dependencies [72b2984]
- Updated dependencies [32584c9]
- Updated dependencies [32353e6]
- Updated dependencies [559acfa]
- Updated dependencies [e8088ea]
- Updated dependencies [bb94124]
- Updated dependencies [928e0b2]
- Updated dependencies [5d816a6]
- Updated dependencies [85e6347]
- Updated dependencies [f9816c0]
- Updated dependencies [78523d2]
- Updated dependencies [40b50c2]
- Updated dependencies [4ae2005]
- Updated dependencies [85bdad2]
- Updated dependencies [4a10672]
- Updated dependencies [ee180f6]
- Updated dependencies [cc11297]
- Updated dependencies [ff37699]
  - @dxos/app-framework@0.12.0
  - @dxos/app-toolkit@0.12.0
  - @dxos/compute-runtime@0.12.0
  - @dxos/client@0.12.0
  - @dxos/echo@0.12.0
  - @dxos/react-ui@0.12.0
  - @dxos/link@0.12.0
  - @dxos/protocols@0.12.0
  - @dxos/config@0.12.0
  - @dxos/compute@0.12.0
  - @dxos/cli-util@0.12.0
  - @dxos/client-protocol@0.12.0
  - @dxos/react-ui-form@0.12.0
  - @dxos/client-services@0.12.0
  - @dxos/edge-client@0.12.0
  - @dxos/graph@0.12.0
  - @dxos/app-graph@0.12.0
  - @dxos/halo@0.12.0
  - @dxos/react-ui-list@0.12.0
  - @dxos/plugin-observability@0.12.0
  - @dxos/ui-theme@0.12.0
  - @dxos/util@0.12.0
  - @dxos/halo-adapter-client@0.12.0
  - @dxos/react-client@0.12.0
  - @dxos/shell@0.12.0
  - @dxos/react-ui-pickers@0.12.0
  - @dxos/halo-react@0.12.0
  - @dxos/async@0.12.0
  - @dxos/context@0.12.0
  - @dxos/effect@0.12.0
  - @dxos/log@0.12.0
  - @dxos/errors@0.12.0
  - @dxos/invariant@0.12.0
  - @dxos/keys@0.12.0

## 0.11.1

### Patch Changes

- @dxos/app-framework@0.11.1
- @dxos/app-toolkit@0.11.1
- @dxos/async@0.11.1
- @dxos/cli-util@0.11.1
- @dxos/client@0.11.1
- @dxos/client-protocol@0.11.1
- @dxos/client-services@0.11.1
- @dxos/compute@0.11.1
- @dxos/compute-runtime@0.11.1
- @dxos/config@0.11.1
- @dxos/context@0.11.1
- @dxos/credentials@0.11.1
- @dxos/echo@0.11.1
- @dxos/echo-client@0.11.1
- @dxos/echo-protocol@0.11.1
- @dxos/edge-client@0.11.1
- @dxos/effect@0.11.1
- @dxos/errors@0.11.1
- @dxos/halo@0.11.1
- @dxos/halo-adapter-client@0.11.1
- @dxos/halo-react@0.11.1
- @dxos/invariant@0.11.1
- @dxos/keys@0.11.1
- @dxos/log@0.11.1
- @dxos/protocols@0.11.1
- @dxos/react-client@0.11.1
- @dxos/react-ui-form@0.11.1
- @dxos/react-ui-list@0.11.1
- @dxos/react-ui-pickers@0.11.1
- @dxos/react-ui-syntax-highlighter@0.11.1
- @dxos/shell@0.11.1
- @dxos/util@0.11.1
- @dxos/plugin-graph@0.11.1
- @dxos/plugin-observability@0.11.1

## 0.11.0

### Minor Changes

- 08a3eea: Plumb ephemeral trace events through the swarm (DX-1125).

  Adds tag-based broadcast pub/sub over the existing swarm messaging layer (spec 1): a message may carry `tags` instead of a single `recipient`, and a subscriber registers a tag set and receives any broadcast whose tags intersect (logical OR). New wire fields (`signal.Message.tags`, `signal.SubscribeMessagesRequest`, `messenger.Message.tags`, `SwarmRequest.SUBSCRIBE`/`subscribe_tags`) and a dedicated `onBroadcast` channel keep broadcasts off the point-to-point path.

  On top of that (spec 2), remote runtimes broadcast their ephemeral trace messages so clients can watch live progress: `Trace.messageToTags`/`Filter`/`matchesFilter`/`encodeTraceMessage`, a `SwarmTraceSink` producer, `Process.Monitor.subscribeToTraceMessages(filter)`, a `RemoteTraceMonitor` swarm source merged into the aggregate monitor, and a plugin-client consumer that projects remote `status.update` events into the progress registry.

### Patch Changes

- 5b05d75: Resolve an object's canonical navigation path through `NavigationOperation.ResolveNavigationTargets`, so opening an object from a generic surface (a card, a search result, an agent following a reference) lands where the nav tree shows it — its collection, or its type's sidebar section — instead of the hidden database path every object falls back to. This also fixes the nav tree showing no selection for objects opened from cards.
- a77e1a2: Force a full reload when the client reconnects to a newly-elected leader worker, as an interim fix for guest tabs breaking after the leader tab closes.
- eec72c5: Fix comment author attribution and reset-device reload. `useIdentity` now seeds its atom with the service's synchronous snapshot so the current identity is available on the first render instead of a transient `undefined` — a comment sent in that window was stamped with an empty sender and never matched its author, hiding the edit affordance. During `client.reset()` the worker-reconnect handler now reloads to the origin (fresh boot) rather than the stale current route, and `Client.resetting` exposes that state. SQLite hypercore storage drains in-flight writes on `close()` so a save racing reset teardown can't stall or reject against a torn-down connection.
- fe63f19: Fix device-invitation links hanging in apps with onboarding: invitation URL params are now consumed by a single owner (`invitationUrlHandler: false` disables the plugin-client/plugin-space navigation handlers so plugin-onboarding owns the flow), an invitation arriving with an existing identity opens the reset-and-join dialog instead of being dropped, navigation-handler failures surface as a toast instead of dying silently, and `dx halo share --open` always prints the invitation code and reports browser-launch failures with the invitation URL.
- 3f1fc67: Document versioning: Google-Docs-style suggestion review.
  - **@dxos/ui-editor**: `suggestChanges` (inline per-change accept/reject over a proposal) plus word-level `diffHunks`; a multi-author `suggestions({ sources })` overlay and `groupHunks` grouping; the `comments` / `diff` / `suggest` review extensions are grouped under a new `review/` folder (package barrel exports unchanged).
  - **@dxos/app-framework**: `NamePopover` moved to `@dxos/app-framework/ui`, decoupled from translations via a `submitLabel` prop.
  - **@dxos/plugin-markdown**: branch/merge/checkpoint exposed as agent skill tools; a `suggest` diff-view mode; the compare/diff overlay is reconfigured through a CodeMirror `Compartment` so switching views no longer remounts the editor (rebinding automerge / losing selection). The branch banner's Compare toggle becomes a three-way `[Base | Diff | Branch]` view selector — Base shows the parent content at the anchor read-only.
  - **@dxos/plugin-space**: `NamePopover` removed from `@dxos/plugin-space/components` (relocated to `@dxos/app-framework/ui`); `VersioningState.compare` (boolean) becomes `view` (`base | diff | branch`).
  - **@dxos/types**: new `ContentBlock.Change` (a suggested edit — `before`/`after`) so a suggestion renders through the message tile.
  - **@dxos/react-ui-thread**: `Message.Tile` renders the `change` block (struck original → proposed text) with Accept/Reject via new `onAcceptChange`/`onRejectChange` thread callbacks; `CommentThread` is decoupled from `@dxos/react-client` (metadata/activity/identity injected as props).
  - **@dxos/plugin-review**: a unified review companion — comment threads and suggestion cards in one surface. `Suggestions` reactively tracks the document's active `kind:'suggestion'` branches (one bound probe per branch) and renders each grouped change as a change-block tile, routing Accept/Reject to the durable `AcceptChange`/`RejectChange` ops.
  - **@dxos/plugin-markdown**: a `SuggestEdit` operation + "Suggest edits" authoring action that find-or-creates the caller's per-author suggestion branch and edits it.

- 382d00d: Fix `dx account login --method email` to handle the hub's `needsIdentity` response, creating a local identity and retrying so the login completes instead of waiting for a token that never arrives.
- 382d00d: Fix `dx account logout` leaving the profile unusable: it removed the data root directory without recreating it, so every subsequent command failed with "unable to open database file".
- 6439417: Publish the HALO Effect service packages (`@dxos/halo`, `@dxos/halo-adapter-client`, `@dxos/halo-react`) and begin migrating Composer/plugins off direct `@dxos/client` HALO access onto them: `plugin-client` now provides `Identity.Service` / `Space.Service` layer specs and wraps the app in `HaloProvider`.
- bda1a02: Add an optional `attach` flag to the `database.objectCreate` operation that files the created object in the space root collection (visible in the navigation tree). CLI: `dx profile create` templates now enable edge features (fixes device invitations hanging at "Connecting…" for CLI-created profiles), and `dx halo share` prints the joinable URL.
- 832d150: Report passkey login failures on the welcome screen instead of silently doing nothing. `RedeemPasskey` now fails with `PasskeyDismissedError`, `PasskeyRejectedError`, or `PasskeyLoginError`, which `classifyPasskeyFailure` maps to a message.
- aea1e6e: Fix an uncaught `Space is not initialized` error thrown from the space replication-progress capability. The `client.spaces` subscription fires while a space is still initializing (on app load and during space creation), and the space name was read eagerly from `space.properties`, whose getter throws until the space is ready. The name is now read lazily per sync-state update and only once the space reaches `SPACE_READY`.
- Updated dependencies [f9ba47a]
- Updated dependencies [4e64123]
- Updated dependencies [c035062]
- Updated dependencies [aea1e6e]
- Updated dependencies [9da013f]
- Updated dependencies [e0e1a9f]
- Updated dependencies [46ec569]
- Updated dependencies [5b05d75]
- Updated dependencies [b5ecf54]
- Updated dependencies [3f6ac61]
- Updated dependencies [091ebe4]
- Updated dependencies [eec72c5]
- Updated dependencies [ed992c2]
- Updated dependencies [1a9bca1]
- Updated dependencies [ed992c2]
- Updated dependencies [bf013a1]
- Updated dependencies [a83d98a]
- Updated dependencies [a19443b]
- Updated dependencies [3f1fc67]
- Updated dependencies [6df314a]
- Updated dependencies [962c8cd]
- Updated dependencies [2048cb3]
- Updated dependencies [856c4f0]
- Updated dependencies [46ec569]
- Updated dependencies [f8637f1]
- Updated dependencies [b8c0825]
- Updated dependencies [4e64123]
- Updated dependencies [6a03a30]
- Updated dependencies [2fe5a7a]
- Updated dependencies [7b270f2]
- Updated dependencies [7b270f2]
- Updated dependencies [af5fbf4]
- Updated dependencies [717edc0]
- Updated dependencies [d547045]
- Updated dependencies [6439417]
- Updated dependencies [277e365]
- Updated dependencies [410a019]
- Updated dependencies [d958118]
- Updated dependencies [2a68c3b]
- Updated dependencies [30ae5eb]
- Updated dependencies [e65432c]
- Updated dependencies [f6a01e3]
- Updated dependencies [c9651f1]
- Updated dependencies [5e7839e]
- Updated dependencies [923d5be]
- Updated dependencies [85893fe]
- Updated dependencies [c727a43]
- Updated dependencies [9f7d5ad]
- Updated dependencies [6067460]
- Updated dependencies [717edc0]
- Updated dependencies [12fd785]
- Updated dependencies [51aaffe]
- Updated dependencies [d547045]
- Updated dependencies [f10b1ce]
- Updated dependencies [f7d7735]
- Updated dependencies [717edc0]
- Updated dependencies [5f08a6a]
- Updated dependencies [114fb98]
- Updated dependencies [37874ce]
- Updated dependencies [b591791]
- Updated dependencies [848ba1b]
- Updated dependencies [f15c632]
- Updated dependencies [3761762]
- Updated dependencies [c9da903]
- Updated dependencies [bf055c8]
- Updated dependencies [55bb048]
- Updated dependencies [c727a43]
- Updated dependencies [14848a1]
- Updated dependencies [4bb7e3b]
- Updated dependencies [179afc6]
- Updated dependencies [da66270]
- Updated dependencies [4df6cf3]
- Updated dependencies [41141d8]
- Updated dependencies [7b270f2]
- Updated dependencies [686fac1]
- Updated dependencies [ed992c2]
- Updated dependencies [37c17cc]
- Updated dependencies [08a3eea]
- Updated dependencies [ed992c2]
- Updated dependencies [ed992c2]
- Updated dependencies [c58ebb7]
- Updated dependencies [5585ec8]
- Updated dependencies [4f24c4e]
- Updated dependencies [ac51564]
- Updated dependencies [499dde4]
  - @dxos/echo@0.11.0
  - @dxos/async@0.11.0
  - @dxos/react-ui-list@0.11.0
  - @dxos/react-ui@0.11.0
  - @dxos/app-toolkit@0.11.0
  - @dxos/client@0.11.0
  - @dxos/compute-runtime@0.11.0
  - @dxos/echo-client@0.11.0
  - @dxos/compute@0.11.0
  - @dxos/util@0.11.0
  - @dxos/client-protocol@0.11.0
  - @dxos/client-services@0.11.0
  - @dxos/protocols@0.11.0
  - @dxos/app-framework@0.11.0
  - @dxos/keys@0.11.0
  - @dxos/react-ui-form@0.11.0
  - @dxos/halo@0.11.0
  - @dxos/ui-theme@0.11.0
  - @dxos/log@0.11.0
  - @dxos/react-client@0.11.0
  - @dxos/shell@0.11.0
  - @dxos/cli-util@0.11.0
  - @dxos/config@0.11.0
  - @dxos/edge-client@0.11.0
  - @dxos/plugin-graph@0.11.0
  - @dxos/credentials@0.11.0
  - @dxos/halo-adapter-client@0.11.0
  - @dxos/plugin-observability@0.11.0
  - @dxos/react-ui-pickers@0.11.0
  - @dxos/react-ui-syntax-highlighter@0.11.0
  - @dxos/context@0.11.0
  - @dxos/effect@0.11.0
  - @dxos/echo-protocol@0.11.0
  - @dxos/halo-react@0.11.0
  - @dxos/errors@0.11.0
  - @dxos/invariant@0.11.0
