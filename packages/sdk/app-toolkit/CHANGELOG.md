# @dxos/app-toolkit

## 0.12.0

### Minor Changes

- 0280a6a: Omitting `activatesOn` on a plugin module now puts it in the **idle** wave rather than the startup wave. A module that must run at boot has to declare `activatesOn: ActivationEvents.Startup` explicitly.

  This is a behaviour change for out-of-repo plugin authors: an un-annotated module that previously ran during startup now runs at host idle. Un-annotated modules remain pullable as providers, so one that a startup module `requires` is still activated ahead of its own wave — the change is only visible for modules nothing on the boot path depends on.

  The `@dxos/app-toolkit` maker families that back the app shell — `settings`, `operationHandler`, `reactContext`, `reactRoot`, `navigationResolver` and `navigationHandler` — now state `Startup` explicitly, so modules built with them are unaffected. `appGraphBuilder` (idle) and `skillDefinition` (assistant start) were already explicit.

- 2d4107f: Add `dx account signup <code>`, which validates an access code and then signs up with either email or an Atmosphere (atproto) OAuth account, mirroring Composer's sign-up flow. This replaces `dx account login --code`, which is removed — `login` recovers an existing account again, and account creation lives in `signup`. The `--method` name for the atproto OAuth path is now `atmosphere` in both commands, matching Composer's wording; `--method atproto` is still accepted as an alias.

  The sign-up flows themselves move to `@dxos/app-toolkit/Account`, shared by Composer's welcome screen, the OAuth redirect finalizer, and the CLI: the pre-signup email probe, access-code validation and redemption, and OAuth registration completion are one implementation with typed errors (`EmailAlreadyRegisteredError`, `EmailProbeUnavailableError`, `AccountRedemptionError`). Supporting moves: the `Connection` type joins `AccessToken` and `Cursor` in `@dxos/link` (no longer exported from `@dxos/plugin-connector`), `ATMOSPHERE_SOURCE` joins `OAuthProvider` in `@dxos/protocols`, and the Atmosphere connector is identified by `OAuthProvider.ATPROTO` as its `Connector.id` (`ATMOSPHERE_PROVIDER_ID` is gone; the label is unchanged). Connections created before this carry `connectorId: 'atmosphere'` and no longer resolve to a registered connector — token refresh and source lookups are unaffected, but re-auth and per-connector actions need `connectorId` set to `'atproto'`. `LoginResponse.token` is also removed: no login path ever returned a recovery token inline (the magic link always goes out by email), so the field and its unreachable consumer branches are dropped.

  Two fixes on the OAuth path: the CLI's OAuth round-trip now normalizes the configured edge URL to `http(s)` before calling `/oauth/initiate` (`fetch` rejects the `wss://` form that client configs carry, which broke `--method atmosphere` for both `signup` and `login`), and `getEdgeUrlWithProtocol` is exported from `@dxos/edge-client` so that normalization is shared rather than re-derived. `dx account signup` no longer prints `accountId` alongside `identityDid` — the hub keys accounts by identity DID, so the two were always the same value under two names.

- 6d28380: Composer renders mobile natively, projecting the active deck as a navigation stack with a companion
  drawer; plugin-simple-layout is retired and the layout mode it reported as `'simple'` is now
  `'mobile'`. `Card` with `fullWidth` tracks its container instead of holding a minimum width.

  The mobile renderer itself lives in the new (unpublished) `@dxos/plugin-mobile`, which reads deck
  state and owns no state of its own. `plugin-deck` keeps every operation, the URL handler and the
  layout state, and `DeckPlugin.make({ platform: 'mobile' })` now means headless: it contributes no
  React root and no mobile surfaces, leaving those to the mobile plugin. Deck additionally exposes a
  `./hooks` entrypoint, `./overlays` (the shared dialog/popover/toaster shell) and `./testing` (the
  story harness) so a co-registered renderer can drive them.

- b02fe16: Rebuilt `@dxos/graph` on Effect's `Graph` module and split the generic expansion engine out of the app graph builder.

  `GraphModel` is now a long-lived Effect `MutableGraph` with granular per-node and per-edge atom views, `batch()` for single-notification mutation groups, incremental adjacency, `release(ids)` for unloading a subgraph outright (distinct from tombstoning `removeNode`), and opt-in `retainAtoms` that keeps each node's atom mounted for the life of the node. `ReadonlyGraphModel` and `ReactiveGraphModel` merge into `AbstractGraphModel`; constructors take an options bag.

  `@dxos/graph/GraphBuilder` owns the extension registry, connector subscriptions, id qualification, ordering and dirty-flush over a `Store` port, with `ModelGraphBuilder` as the default specialization; `@dxos/app-graph`'s `AppGraphBuilder` specializes the same engine with app nodes, actions and URL bindings (`BuilderExtension.url` is now the generic `meta`). Node-id path helpers move to `@dxos/graph/GraphNode`. The app-graph namespaces are renamed to `AppGraph`/`AppGraphBuilder`/`AppGraphNode` and published as subpaths under those names; the old `NodeMatcher` splits, with the generic combinators in `@dxos/graph/GraphNodeMatcher` and the ECHO-aware ones in `@dxos/app-toolkit/AppNodeMatcher`. Writes read the model directly instead of atoms (a mid-flush atom read returns pre-flush state), flushes coalesce through `GraphModel.batch` rather than `Atom.batch` (whose deferred rebuild strands invalidations raised after its rebuild pass), and expansion, updates and removal are measured faster than before the rebuild across the board.

- ab79741: Fix planks restoring to Not Found — and being erased from the URL — on a cold reload.

  `NavigationTargetLoader.load` now returns `'exists' | 'absent' | 'unknown'` instead of a boolean. The URL restore skips its retry only for a pair a store positively disconfirmed; an unreachable edge, a space list that has not arrived, or an id that does not parse now read as `unknown` and keep the retry. Previously every uncertainty collapsed to `false`, which revoked the retry — and on a cold reload the graph is always still building, so the plank fell to Not Found, was dropped from the URL on the next sync (a Not Found sentinel has no URL representation), and was gone for good on the following reload.

  Loader authors must widen their return type; `'exists'`/`'absent'` correspond to the old `true`/`false`, and anything the loader could not determine should be `'unknown'`.

  A URL pair's id `+`-joins every node-id segment after its binding's path, and which segment holds the object id is extension-specific — `<objectId>+<view>` for a mailbox's filter views, `<typeSlug>+<objectId>` for a database object. Resolution now asks about every ULID-shaped segment rather than assuming the last one, so mailbox views (`sent`, `drafts`, `all-mail`, `subscriptions`) resolve on reload instead of 404ing.

  New `GraphPath.tryGetEidCandidates` backs the existence check for paths whose object id is interior; `GraphPath.tryGetEid` is unchanged and still strictly terminal, so plank dedup keeps treating two views of one object as two planks. New `NotFound.createEdgeExistenceProbe` is the fallible form of `createEdgeExistenceChecker`, for callers that must tell an empty query from a failed one.

  A URL restore no longer collapses an unresolved plank to the not-found sentinel. It keeps the node id the pair resolved _toward_ (`PathResolution` now reports the candidate it attempted), records the plank in the new ephemeral `unresolved` state, and renders the not-found article in place — so the plank heals into the real object the moment its node lands, instead of being replaced by a different object that discards which one was asked for.

  The deck also refuses to write a URL that has lost a plank. `representNode` reads live graph provenance, which a plank loses whenever its node is out of the graph, so the outbound sync now falls back to each plank's last known representation and skips the write entirely if any plank is still unrepresentable. Previously the pair was silently dropped and `replaceState`d over the URL it was restoring from, which is what turned a transient miss into permanent loss: the next reload restored the shortened URL and the plank was gone.

- 63e500b: Space object CRUD is now projected from operations, and space operations no longer reach for app
  plugins to do it.

  `addObject`, `getObject`, `updateObject`, `removeObjects` and `queryObjects` are MCP-projected
  operations, so a remote agent reads and writes space objects through the same verbs the app uses.
  `addObject` takes one `object` field that is a union of a live entity and a `{ "@type", ...props }`
  description, so the schema itself admits exactly one form rather than two optional fields policed by
  a handler check; `removeObjects` accepts references alongside live entities,
  and space operations no longer require a capability manager they never use — both so a host without
  the app's UI capabilities can still invoke them.

  Observability events are registered rather than emitted. A plugin contributes an
  `ObservabilityMapping` — the operation, the event name, and how to derive the event's properties
  from the invocation's input and output — through the new `Capabilities.ObservabilityMapping`, and
  plugin-observability listens to the operation invocation stream and sends the event, exactly as undo
  derives an inverse from an `UndoMapping`. `Create`, `Share`, `Migrate`, `AddObject` and `AddType`
  no longer invoke `ObservabilityOperation.SendEvent` themselves, `SpacePlugin`'s `observability`
  option now decides whether the mappings are registered, and `SpaceOperationConfig.observability` is
  removed as a result.

  Skills move to the plugins that own their subject. `@dxos/plugin-connector` now owns the
  `connectors` skill (import `ConnectorsSkill` from it; enabling ConnectorPlugin contributes it), and
  `@dxos/plugin-space` owns the **Database** skill — object CRUD over the projected verbs, exported as
  `DatabaseSkill` from `@dxos/plugin-space/DatabaseSkill`.

  `@dxos/assistant-toolkit`'s own database skill is now chat-context binding alone
  (`contextAdd`/`contextRemove`), so it is renamed: `ChatContextSkill`, keyed `org.dxos.skill.chatContext`,
  exporting `ChatContextHandlers` and `ChatContextOperations`. The `org.dxos.skill.database` key goes
  with the verbs to plugin-space's Database skill, so a chat already bound to it keeps reading and
  writing objects. Everything else either moved to
  plugin-space or was retired as a duplicate: `objectCreate`, `objectDelete`, `objectUpdate`, `query`
  and `load` are covered by the projected verbs; `relationDelete` by `removeObjects`, which already
  accepts relations; `tagAdd`, `tagRemove` and `schemaList` moved as the annotated `addTag`,
  `removeTag` and `queryTypes`; and `relationCreate` and `schemaAdd` merged into plugin-space's
  existing `addRelation` and `addType`, each gaining the described form (a typename, references, or a
  JSON Schema) beside the live one, so the same verb serves an in-process and a remote caller.

  `Capability.getAllAvailable` and `Plugin.activateIfAvailable` are new: they read the app's
  contributions where they exist and return nothing where they do not, declaring no requirement. This
  is what lets `addType` fire `SpaceEvents.TypeAdded` and its `OnTypeAdded` callbacks in the app while
  still running on a host that has neither. Two
  capabilities moved onto the plugin-space verbs with the operations: `queryObjects` gained `in` (scope
  results to objects reachable from the given ones — how queue-backed mail is addressed), and
  `getObject` became `getObjects`, taking an array so a batch of references resolves in one call.

  The `discord` and `linear` skills are removed. Both advertised a tool whose handler set was
  registered nowhere, so invoking either failed at runtime; plugin-discord and plugin-linear already
  own connector-based sync for those services.

  Skill definitions are the atomic unit of MCP projection. A skill's `tools` list decides which
  operations project as MCP tools, and the load-the-skill-first pointer in each tool's description
  derives from that membership (the SEP-2640 shape). **`Operation.mcpTool` is removed** — with
  inclusion decided by skills and safety carried by `Operation.mutation`, nothing was left that the
  operation's own meta could not say: a tool's name is the key's final segment and its description is
  the operation's `description`. The three surviving overrides moved into meta, and
  `ProjectOperation.Create`'s key becomes `projectCreate` (its final segment was a too-generic
  `create`, and the key is now what names the tool). Folding those descriptions into meta also puts
  them in front of the in-app assistant, which never saw the MCP-only text.
  `DatabaseSkill` and `CodeProjectSkill` opt in with `mcpPrompt: true` and list their verbs
  (`CodeProjectSkill` now exports `operations`, spanning the project, task, milestone and outline
  verbs).

  Safety generalized into operation meta: the new `Operation.mutation('none' | 'write' |
'destructive')` annotation classifies an operation's effect on state — side-effect free, mutating
  but recoverable, or irreversible — as a fact about the operation rather than MCP projection
  config. The MCP server maps it to `readOnlyHint`/`destructiveHint` exactly as `safety` did, and
  now also maps the existing `Operation.idempotent` annotation to `idempotentHint`. An unclassified
  operation emits no hints, which clients treat as possibly-destructive.

  The space operations are one namespace: `SpaceObjectOperation`'s verbs (`getObjects`,
  `queryObjects`, `queryTypes`, `updateObject`, `addTag`, `removeTag`) move into `SpaceOperation`, and
  the `@dxos/plugin-space/SpaceObjectOperation` subpath is removed — import them from
  `@dxos/plugin-space/SpaceOperation`. `addType` and `addRelation` also drop their `db` input: the
  database comes from `Database.Service`, which callers key with `{ spaceId }` in the invoke options.

  `addObject`, `addRelation` and `addType` now declare `Database.Service` as a required service, and
  the MCP projection keys the ambient `spaceId` tool parameter off that declaration — only
  space-addressed tools advertise it (`removeObjects` takes its space from the entities or
  space-qualified refs it is given, so it declares nothing and carries no parameter). Resolution is
  strict: the service materializes only from `InvokeOptions.spaceId` (or the parent process's
  environment for nested invocations), so every call site that needs the database passes
  `{ spaceId: db.spaceId }` in options — the create-object entries across the plugins included.

  `@dxos/app-toolkit` gains `NavigationResolver.forType(type, { getPath, getLabel?, position?, pages? })`
  — the whole body of the common custom-section navigation resolver (load the queried object, check it
  is an instance of the type, answer the section's path for it), so contributing one is a one-call
  module. Sections built with `TypeSection.createTypeSectionExtension` still need no resolver at all:
  their url binding ends in the typename, which plugin-space's generic lookup already reads.
  plugin-studio and plugin-inbox now use the helper, and the custom-shaped sections that were missing
  a resolver gained one through it — plugin-blogger (Publication), plugin-code (CodeProject) and
  plugin-commerce (Provider) — so their objects resolve to their sections instead of only the generic
  database path.

  Each plugin exposes one operation handler set, on the subpath convention. `@dxos/plugin-space`'s
  `./operations` subpath is replaced by `./SpaceOperationHandlerSet`, whose single `handlers` set
  carries every space operation — the separate curated "serializable" subset is gone, because the
  constraint that forced it is: the new `Operation.serializable(operations)` serializes a handler
  list tolerantly, dropping (with a warning) the few operations whose input schemas cannot render as
  JSON, so a registry can be fed the full set without an `ImportSpace`-style schema failing the whole
  registration.

  `@dxos/mcp-server`'s two namespaces are renamed. `Gateway` becomes **`McpRegistry`** — "gateway"
  reads as an MCP proxy fronting other servers, which is the opposite of what it is: the host's link
  to its operation registry, which a host implements (`/McpRegistry`). `Server` becomes `McpServer`,
  and it absorbs the skill-backed surface: `McpServer.fromSkills({ skills })` yields the projected MCP surface (prompts, tools,
  `skillLoad`) requiring only `Operation.Service`, beside `McpServer.layer` for a host reading a
  registry through `Gateway`. The name deliberately shadows effect's `McpServer` because it wraps
  it — `toolkit` and `layerStdio` are re-exported, so a host needs one import rather than two under
  different names. The package exports `/Gateway` and `/McpServer`, each with a build entry so the
  published package can resolve them. `Gateway.SkillRecord` carries `tools`.

  Fixed in `@dxos/echo` along the way: a struct with an open rest signature (`Schema.StructWithRest`)
  now survives the JSON Schema round-trip. Effect 4 omits `additionalProperties` when the rest
  signature's value type is unconstrained, and the serializer only restored it for bare records — so
  the decoder rebuilt the struct closed and `addObject`'s draft silently dropped every field beyond
  `@type`. The restore now applies whenever the key is absent, which is unambiguous: a closed struct
  always carries `additionalProperties: false` explicitly.

  `addObject` persists a described object rather than only referencing it. A draft is instantiated detached and `CollectionModel.add` files it by pushing a ref — on the branch that mints a root collection for a space that has none, nothing added the object to the database, so the ref dangled: the call returned an id whose object could not be read back, and nothing replicated. Only the remote path was reachable, since in-process callers pass a live object that is already in a database.

  A database is no longer an operation input. `SpaceOperation.AddObject` and `InboxOperation.AddMailbox` take `target` as an optional _collection_ — absent means the space root — and resolve the database from the invocation's space id instead. A database is an in-process handle that cannot cross an RPC boundary, so accepting one in an input schema only ever worked for in-process callers; naming the space is the form that works for both. Call sites that passed `target: db` drop it (most already passed the matching `spaceId`), and the handlers lose the `Effect.provide(Database.layer(db))` they needed to reconcile an input database against the declared service.

- 306f50d: Mail and calendar providers now own their own operations. `GoogleMailSync`, `GmailSend`,
  `MaterializeGmailTarget`, `GetGoogleCalendars`, `GoogleCalendarSync`, `MaterializeGoogleCalendarTarget`
  (was `MaterializeCalendarTarget`), `CreateGoogleCalendarEvent`, `GetGoogleContactGroups` and
  `GoogleContactsSync` move from `@dxos/plugin-inbox/InboxOperation` to
  `@dxos/plugin-google/GoogleOperation`; `JmapSync`, `MaterializeJmapTarget` and `JmapSend` move to
  `@dxos/plugin-jmap/JmapOperation`. Their operation DXNs change accordingly.

  The Inbox, Inbox (Send) and Calendar skills no longer name a provider: their tools are resolved from
  the connectors and send providers a deployment actually installs. A JMAP-only deployment previously
  advertised Gmail tools it could not run and had no sync tool of its own.

  A draft calendar event is now one carrying no foreign key from any provider, rather than none from
  Google — events synced by any other calendar connector were reported as perpetual drafts.

  `ScanMailbox` is now `AnalyzeMailbox`, and its progress meters name their phase as well as their
  mailbox ("Syncing Inbox", "Analyzing Inbox") — two meters run over one mailbox, so the bare name left
  the user unable to tell which was moving.

  A card header's leading depiction is now contributable per type via the `AppSurface.CardIcon` role.
  Hosts wrap their existing default in `CardIconSlot`, which renders a contributed surface when one
  matches and the default otherwise — `Surface`'s own `fallback` is the error boundary, and unlike
  `CardContent` a miss here cannot render nothing. Scoped to cards deliberately: a 6-unit card block
  affords initials or a photograph where a 16px navtree row does not, so non-card surfaces keep
  resolving `IconAnnotation` through `Obj.getIcon`. `ObjectAvatar` now derives its initials' hue from the
  object's label rather than its type, since a type declaring a single hue put every instance on the same
  disc; it is no longer a card's default depiction, only what a type opts into.

  **`@dxos/react-ui` breaking:** `Message` is renamed to `Banner` — `Message.Root`/`Content`/`Title` are
  now `Banner.*`, the `message.*` theme keys are `banner.*`, and the `Callout` alias is removed. A new
  `Deferred` holds a fallback back until a pending state has lasted `delay`, then keeps it for at least
  `minDuration`, so a momentary empty state is never rendered as the answer.

- dea5df9: Sample spaces are now built from a shared mechanism, and a new space can be created from one.

  `@dxos/app-toolkit/SampleSpace` is an Effect builder whose unit is a _phase_: a named piece of
  content that declares the schemas it needs, so a space's type registration is derived from its phase
  list instead of a hand-maintained array that drifts. It supplies the services sample content kept
  re-implementing — a fixed reference clock (so a rebuild produces the same timestamps), deferred feed
  appends (feed entities only get DXNs after a flush, which is now structural rather than a comment),
  root-collection bootstrap, and tag URIs resolved once and stored space-relative so membership
  survives the space-id remap on import — plus `collection`, `children`, `seed` and `tagBatch`.

  One definition runs either way: `applyTo` writes it into a live space, and `buildArchive`
  (in `@dxos/app-toolkit/testing`) builds it headlessly into a `.dx.json` archive. That is what lets
  the content behind a committed onboarding snapshot also serve as a template offered in the app.

  Three sample spaces run on it — Bramble Coffee Roasters (the onboarding snapshot, unchanged in
  content: 77 objects, 3 feeds, 127 typed entities), a software-project space, and a CRM pipeline —
  and the Gmail mbox importer was ported to it as well, retiring the last copy of the
  boot/create/populate/export harness those scripts used to duplicate.

  Two capabilities carry them. Plugins offer content through `AppCapabilities.SampleSpace`, gated on
  `ActivationEvents.SampleSpacesRequested` so it loads only once something asks for the list;
  `SpaceCapabilities.SpaceTemplate` is what the Create Space dialog lists, letting a new space be
  seeded from a template at creation time. The debug plugin owns the demo content and adapts the
  former into the latter, so neither the dialog nor the space plugin depends on any content package.

- 678ba58: App configuration moves out of the personal space and into a dedicated **settings space**, and the personal space becomes an ordinary space.

  The settings space is tagged `org.dxos.space.settings`, locked at genesis so it can never be shared, EDGE-replicated so it follows the user across devices, and hidden from the navtree. It holds the cross-space navtree ordering, the Welcome-dismissed flag, and a new **personal space** setting that stores the id of the space to use as the default target for unscoped content (quick entry, chat, preview and entity lookup). That setting can be repointed at any space from Settings → Your spaces.

  A one-time migration runs on `SpacesReady`: it creates the settings space if absent, copies the space ordering across, designates the existing personal space, and stamps `Personal` into that space's `properties.name` (the display name used to come from a translation).

  `AppSpace.PERSONAL_SPACE_TAG` is deprecated — new profiles no longer set it, and it resolves legacy profiles only. `isPersonalSpace`, `setPersonalSpace` and `resolvePersonalSpace` are renamed to `isLegacyPersonalSpace`, `setLegacyPersonalSpace` and `resolveLegacyPersonalSpace`; `getPersonalSpace` keeps its name but now resolves the setting first. New: `SETTINGS_SPACE_TAG`, `isSettingsSpace`, `getSettingsSpace`, `readPersonalSpaceId`, `setPersonalSpaceId`.

  The space creation dialog gains a **Private space** toggle (default off, ahead of the EDGE replication toggle) which locks membership at genesis. Space sharing UI now keys off `space.membershipPolicy` rather than the personal-space tag, so the Members panel is hidden for any private space, not just the personal one. Renaming, re-iconing and deleting the personal space are no longer blocked, except that the space currently designated as personal still cannot be deleted.

  `HelpOperation.HideWelcome` no longer takes a `space` — the flag is app-wide. It is not migrated, so a dismissed welcome carousel reappears once.

- bb94124: Run OAuth in the system browser on desktop, via a loopback callback server, so sign-in and integration flows work in the native app. Adds `NativeOAuth` to app-toolkit and a public `getAuthHeader()` to the EDGE HTTP clients.

### Patch Changes

- 86d1482: Let a dev server start the agent debug port on a known session, and let plugins contribute
  slash-menu commands to the markdown editor.

  `DebugPortStartOptions` gains `session`, so a caller that already knows the id skips the
  copy-the-id handshake. `MarkdownCapabilities.MenuExtension` is a new multi capability: an entry
  names an Operation (not a callback), and contributions are grouped by the contributing plugin.

  Also renames the settings-panel operation's key to `org.dxos.operation.appToolkit.openSettings`.
  It collided with `LayoutOperation.Open`, so neither could be resolved by key alone.

- dbff1e4: Register the app's schema migrations from `@dxos/app-toolkit/AppMigrations` so every host stamps a newly created default space as already migrated. `dx account signup` now drains all of an identity's spaces to EDGE concurrently before exiting, and `dx space sync` does the same when given no space id. Removed `dx halo create`, which minted a local identity with no Account behind it — use `dx account signup` or `dx account login`.
- cafa240: Fix fresh onboarding creating a duplicate settings space: the settings-space bootstrap now waits for the genesis-created space instead of racing its creation, and profiles already carrying a duplicate resolve the space holding the default-space designation as canonical.
- cc45381: Pin the WebAuthn relying party to `composer.space` for deployed builds so recovery passkeys created at labs/staging are accepted by the hub. Existing passkeys created at `labs.composer.space` are orphaned and must be re-created.
- 32468c3: Progress readouts no longer lie about a run they have lost touch with, and two controls stop escaping
  their containers.

  - A monitor that goes 90s without an update is failed as `Stopped reporting`, rather than sweeping
    indefinitely. Every terminal a producer can emit travels the same lossy path its progress does — a
    killed process runs no finalizer, an Effect defect escapes the error channel that would report one,
    and a swarm broadcast is fire-and-forget — so a lost terminal used to pin a meter open forever, and
    (for mailbox sync) leave the Sync button disabled with it.
  - Entering a phase clears the item count the previous phase reported. A producer signals an
    uncountable phase by sending no total, but `total` is an optional schema field — an explicit
    `undefined` and an absent one are the same bytes on the wire — so the sink kept the old numbers and
    drew a determinate bar over work it could not measure.
  - A control's preferred width is expressed as a width rather than a minimum, so a long value (a DID,
    an address) shrinks with its panel instead of overflowing its own field border.
  - The emoji picker's panel is portalled, like every other picker, so a scrolling ancestor no longer
    clips it.
  - `@dxos/react-ui-components` now depends on `@dxos/progress` directly: the meter reads the runtime's
    own `TaskProgress` rather than a mirrored shape, so a producer and the readout cannot drift.
  - `@dxos/progress` gains `phases`/`phase` on `TaskProgress` and `phase`/`total`/`plan` on
    `TaskHandle`, so a run can describe a plan and drop a count it can no longer make.

- 256f286: Projects gain a lifecycle `status` field (`active | paused | blocked | ended`), surfaced through the MCP-projected verbs, and plugin-projects ships a project-management skill for external agents — including the `/codeProject setup` flow that binds a repo to an existing space. The skill's key segment is `codeProject` because the segment doubles as the projected MCP prompt name and plain `project` belongs to assistant-toolkit's own skill.

  `toEffectSchema` recognizes ECHO's reference sentinel before the generic `type: 'object'` branch, so a reference node widened with structural keywords (as a wire boundary may do for schema-unaware consumers) decodes as a reference instead of a plain struct. Serialization is unchanged — persisted schemas stay byte-identical to previous releases.

  Worker (`workerd`) bundles no longer pull in React. Wrangler resolves `workerd, worker, browser` and never `node`, so a `#capabilities` map offering only `node` and `default` handed workers the browser barrel and its React surfaces. Every plugin with a headless entry now resolves a server-safe barrel under a `workerd` condition, and the `check-module-structure` guards trace with `workerd,worker` — the conditions a worker actually resolves — so a reintroduced leak fails the check instead of passing against a build that is never shipped.

- efa7836: Fix settings-space duplication on replicating devices, and heal profiles that already carry duplicates.

  Spaces replicate to a freshly joined or recovered device in creation order, so the legacy personal space always landed before the settings space — and because the legacy tag is immutable and outlives migration, the bootstrap concluded "unmigrated legacy profile" and created another settings space on every such boot, which then replicated to every device.

  Absence is unprovable in an eventually-consistent system, so instead of guarding the create the profile now converges. The survivor is the lowest-id tagged space — a pure function of replicated state, so every device picks the same winner and no device can ever tombstone it. Once the survivor is ready, each duplicate's configuration (properties annotations, including the default-space designation, plus the cross-space ordering) is folded into it and the duplicate is tombstoned, which replicates to the user's other devices; a duplicate holding content the salvage does not recognize is kept rather than destroyed.

- 63629c5: Fixed the sync progress indicator getting stuck showing "sync in progress" after replication had caught up, and collapsed a space's CRDT and feed backlogs into a single progress item.

  - `subscribeToSyncState` now re-establishes the feed sync-state stream after a reconnect (leader change) and clears the feed backlog while it is down — previously the stream died silently and every later document update re-published the last (non-zero) feed counts forever.
  - The space replication progress capability no longer stacks a subscription fiber per space on every spaces-subscription delivery (duplicate writers raced over one monitor key), drops the monitor for a space that leaves the list, and reconciles against a fresh `getSyncState` read every 10s so a missed update cannot outlive the backlog.
  - Documents and feed blocks now share one monitor per space; the breakdown (`4 CRDTs · ↓6 ↑2`) is rendered as the meter's note, which `ProgressMeter` previously ignored.

- Updated dependencies [0280a6a]
- Updated dependencies [86d1482]
- Updated dependencies [af1c007]
- Updated dependencies [106d38a]
- Updated dependencies [8363f12]
- Updated dependencies [9477170]
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
- Updated dependencies [f3f55a8]
- Updated dependencies [b2d5bb2]
- Updated dependencies [069e8ed]
- Updated dependencies [73daef4]
- Updated dependencies [75971ad]
- Updated dependencies [3958355]
- Updated dependencies [b4c7782]
- Updated dependencies [4e417e9]
- Updated dependencies [d194929]
- Updated dependencies [557e243]
- Updated dependencies [49aee6c]
- Updated dependencies [ea11703]
- Updated dependencies [5305365]
- Updated dependencies [c01fef6]
- Updated dependencies [a3d45c4]
- Updated dependencies [881f900]
- Updated dependencies [da37a13]
- Updated dependencies [0a01ff7]
- Updated dependencies [1c995c4]
- Updated dependencies [a69d861]
- Updated dependencies [ba08e65]
- Updated dependencies [5fcd238]
- Updated dependencies [5e8878c]
- Updated dependencies [e094f74]
- Updated dependencies [23d2d8c]
- Updated dependencies [b0953f0]
- Updated dependencies [375b863]
- Updated dependencies [6c6987e]
- Updated dependencies [3e02201]
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
- Updated dependencies [813069c]
- Updated dependencies [8cb5553]
- Updated dependencies [4c107a2]
- Updated dependencies [b9d72bb]
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
- Updated dependencies [10b1239]
- Updated dependencies [9c86066]
- Updated dependencies [5180720]
- Updated dependencies [b600f72]
- Updated dependencies [99e323d]
- Updated dependencies [ea11703]
- Updated dependencies [bf4f1e6]
- Updated dependencies [bcfe4c5]
- Updated dependencies [6328de3]
- Updated dependencies [12b6618]
- Updated dependencies [ebb8f4a]
- Updated dependencies [4f760ce]
- Updated dependencies [557e243]
- Updated dependencies [ca34a80]
- Updated dependencies [29543ca]
- Updated dependencies [e26af7e]
- Updated dependencies [c0e5651]
- Updated dependencies [3214dcf]
- Updated dependencies [24fcadc]
- Updated dependencies [4804da0]
- Updated dependencies [61fe676]
- Updated dependencies [d4b4919]
- Updated dependencies [63e500b]
- Updated dependencies [7c426d4]
- Updated dependencies [cd4da46]
- Updated dependencies [19f19a2]
- Updated dependencies [987f7e1]
- Updated dependencies [1ab4bb8]
- Updated dependencies [0a3e9dd]
- Updated dependencies [256f286]
- Updated dependencies [4689d66]
- Updated dependencies [306f50d]
- Updated dependencies [e207c68]
- Updated dependencies [5b504b4]
- Updated dependencies [eb95cd7]
- Updated dependencies [d7b0a3b]
- Updated dependencies [1482a3f]
- Updated dependencies [4663f24]
- Updated dependencies [2513a52]
- Updated dependencies [2896a58]
- Updated dependencies [1d6f730]
- Updated dependencies [b125655]
- Updated dependencies [f962a7d]
- Updated dependencies [10defed]
- Updated dependencies [9e91762]
- Updated dependencies [f4c2702]
- Updated dependencies [318bbad]
- Updated dependencies [fc83abd]
- Updated dependencies [8904184]
- Updated dependencies [e680b16]
- Updated dependencies [a805212]
- Updated dependencies [f8bfba0]
- Updated dependencies [ea11703]
- Updated dependencies [886453b]
- Updated dependencies [0280a6a]
- Updated dependencies [18597fc]
- Updated dependencies [881f900]
- Updated dependencies [d8e9de1]
- Updated dependencies [0c92b44]
- Updated dependencies [72b2984]
- Updated dependencies [32584c9]
- Updated dependencies [32353e6]
- Updated dependencies [559acfa]
- Updated dependencies [97efbaa]
- Updated dependencies [e8088ea]
- Updated dependencies [bb94124]
- Updated dependencies [928e0b2]
- Updated dependencies [5d816a6]
- Updated dependencies [85e6347]
- Updated dependencies [f9816c0]
- Updated dependencies [578b543]
- Updated dependencies [78523d2]
- Updated dependencies [40b50c2]
- Updated dependencies [4ae2005]
- Updated dependencies [85bdad2]
- Updated dependencies [4a10672]
- Updated dependencies [ee180f6]
- Updated dependencies [cc11297]
- Updated dependencies [ff37699]
  - @dxos/app-framework@0.12.0
  - @dxos/client@0.12.0
  - @dxos/echo@0.12.0
  - @dxos/ai@0.12.0
  - @dxos/react-ui@0.12.0
  - @dxos/link@0.12.0
  - @dxos/protocols@0.12.0
  - @dxos/config@0.12.0
  - @dxos/compute@0.12.0
  - @dxos/types@0.12.0
  - @dxos/client-protocol@0.12.0
  - @dxos/edge-client@0.12.0
  - @dxos/graph@0.12.0
  - @dxos/app-graph@0.12.0
  - @dxos/react-focus@0.12.0
  - @dxos/react-ui-menu@0.12.0
  - @dxos/react-ui-list@0.12.0
  - @dxos/ui-theme@0.12.0
  - @dxos/schema@0.12.0
  - @dxos/credentials@0.12.0
  - @dxos/util@0.12.0
  - @dxos/migrations@0.12.0
  - @dxos/react-client@0.12.0
  - @dxos/react-ui-attention@0.12.0
  - @dxos/react-ui-syntax-highlighter@0.12.0
  - @dxos/context@0.12.0
  - @dxos/effect@0.12.0
  - @dxos/log@0.12.0
  - @dxos/errors@0.12.0
  - @dxos/i18n@0.12.0
  - @dxos/invariant@0.12.0
  - @dxos/keys@0.12.0
  - @dxos/progress@0.12.0

## 0.11.1

### Patch Changes

- @dxos/ai@0.11.1
- @dxos/app-framework@0.11.1
- @dxos/app-graph@0.11.1
- @dxos/client@0.11.1
- @dxos/client-protocol@0.11.1
- @dxos/compute@0.11.1
- @dxos/echo@0.11.1
- @dxos/effect@0.11.1
- @dxos/errors@0.11.1
- @dxos/i18n@0.11.1
- @dxos/invariant@0.11.1
- @dxos/keyboard@0.11.1
- @dxos/keys@0.11.1
- @dxos/log@0.11.1
- @dxos/progress@0.11.1
- @dxos/react-client@0.11.1
- @dxos/react-ui@0.11.1
- @dxos/react-ui-attention@0.11.1
- @dxos/react-ui-list@0.11.1
- @dxos/react-ui-menu@0.11.1
- @dxos/schema@0.11.1
- @dxos/types@0.11.1
- @dxos/ui-theme@0.11.1
- @dxos/util@0.11.1

## 0.11.0

### Minor Changes

- 30ae5eb: Add stable `data-testid`s across the inbox and connector UI (mailbox sync/reply/message actions, message and conversation tiles, connect dropdown) and an optional `testId` param on `AppNode.makeToolbarActionGroup` / `react-ui-menu`'s menu builder, enabling reliable browser-e2e targeting.
- 9f7d5ad: Replace `CommentConfig.getAnchorLabel` with a typename-keyed `AppCapabilities.AnchorResolver` capability; the assistant companion chat now includes the markdown editor's current selection as request context. Fix view-state persistence so a written value (e.g. a text selection) survives without a live subscriber instead of being garbage-collected back to its default.
- 5585ec8: Redesign Composer URLs as pair chains (`/w/<workspace>/<key>/<id>/…`) resolved by the graph builder via per-extension `url: { key, kind, path }` declarations (replacing the `NavigationPathResolver` capability), and collapse the deck's layout modes into a single mode: presentation derives from plank count (fullbleed / tiling / sliding) and fullscreen is transient. Navigation is now gesture-based (no `navigationDefault` setting): nav-tree plain click navigates solo (shift adds a plank), and in-plank/card navigation follows the deck — adding beside the origin when sliding and replacing when solo. `LayoutOperation.Open`'s `disposition` values are `solo | add | auto`. Breaking: `LayoutOperation.SetLayoutMode` is removed, `?plank=` URLs are replaced by the pair-chain grammar, `AppCapabilities.NavigationTargetResolver` now declares its real requirement (`Effect<NavigationTarget[], never, Database.Service>`) so implementations no longer need a cast, and the unused `companionFrameSizing` field is dropped from the deck's persisted state (stripped by the existing migration).
- 499dde4: Move the `WithProperties` test helper from `@dxos/plugin-markdown/testing` to a new `@dxos/app-toolkit/testing` subpath export.

### Patch Changes

- 5b05d75: Resolve an object's canonical navigation path through `NavigationOperation.ResolveNavigationTargets`, so opening an object from a generic surface (a card, a search result, an agent following a reference) lands where the nav tree shows it — its collection, or its type's sidebar section — instead of the hidden database path every object falls back to. This also fixes the nav tree showing no selection for objects opened from cards.
- f10b1ce: Plugin-declared decks and deck scroll stability. A type can now declare how the deck behaves when one
  of its objects is the root: `AppAnnotation.DeckAnnotation` carries a `DeckSpec` (initial planks and a
  chain of levels), `LayoutOperation.Open` accepts `root` + `level` so opening at a level reuses that
  level's plank and closes the levels below it, Collections are navigation targets that open their
  contents as planks, and the mailbox declares `mailbox / message / attachment` (meta-click opens a
  message in its own plank; a message swap carries the open companion along). Deck scrolling is now
  strictly intent-driven: an in-deck click yields to the navigation it triggers, navigations re-issue
  if a reflow kills the glide, browser scroll anchoring is disabled on the deck viewport, a companion
  opening past the trailing edge is revealed by exactly the overflow, and stale `companionPlanks`
  entries are pruned.
- 717edc0: `ProgressMeter` now shows a live elapsed-time readout for indeterminate tasks (no known total) instead of a perpetually-pulsing bar; the fractional bar and remaining-time ETA render only when a total is known.
- Updated dependencies [f9ba47a]
- Updated dependencies [4e64123]
- Updated dependencies [c035062]
- Updated dependencies [5585ec8]
- Updated dependencies [9da013f]
- Updated dependencies [e0e1a9f]
- Updated dependencies [46ec569]
- Updated dependencies [b5ecf54]
- Updated dependencies [3f6ac61]
- Updated dependencies [091ebe4]
- Updated dependencies [eec72c5]
- Updated dependencies [ed992c2]
- Updated dependencies [68e61ca]
- Updated dependencies [ed992c2]
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
- Updated dependencies [d547045]
- Updated dependencies [277e365]
- Updated dependencies [410a019]
- Updated dependencies [d958118]
- Updated dependencies [2a68c3b]
- Updated dependencies [6d2afe0]
- Updated dependencies [e65432c]
- Updated dependencies [f6a01e3]
- Updated dependencies [c9651f1]
- Updated dependencies [5e7839e]
- Updated dependencies [923d5be]
- Updated dependencies [85893fe]
- Updated dependencies [6067460]
- Updated dependencies [717edc0]
- Updated dependencies [12fd785]
- Updated dependencies [51aaffe]
- Updated dependencies [1a989ed]
- Updated dependencies [d547045]
- Updated dependencies [f7d7735]
- Updated dependencies [5f08a6a]
- Updated dependencies [37874ce]
- Updated dependencies [848ba1b]
- Updated dependencies [f15c632]
- Updated dependencies [3761762]
- Updated dependencies [c9da903]
- Updated dependencies [55bb048]
- Updated dependencies [bdf9f68]
- Updated dependencies [4bb7e3b]
- Updated dependencies [4df6cf3]
- Updated dependencies [7b270f2]
- Updated dependencies [686fac1]
- Updated dependencies [ed992c2]
- Updated dependencies [96109be]
- Updated dependencies [37c17cc]
- Updated dependencies [f0ec728]
- Updated dependencies [08a3eea]
- Updated dependencies [bb63d91]
- Updated dependencies [ed992c2]
- Updated dependencies [ed992c2]
- Updated dependencies [c58ebb7]
- Updated dependencies [a49131a]
- Updated dependencies [ac51564]
  - @dxos/echo@0.11.0
  - @dxos/app-graph@0.11.0
  - @dxos/schema@0.11.0
  - @dxos/react-ui-list@0.11.0
  - @dxos/react-ui@0.11.0
  - @dxos/client@0.11.0
  - @dxos/compute@0.11.0
  - @dxos/util@0.11.0
  - @dxos/client-protocol@0.11.0
  - @dxos/app-framework@0.11.0
  - @dxos/keys@0.11.0
  - @dxos/react-ui-attention@0.11.0
  - @dxos/types@0.11.0
  - @dxos/ui-theme@0.11.0
  - @dxos/log@0.11.0
  - @dxos/react-client@0.11.0
  - @dxos/ai@0.11.0
  - @dxos/react-ui-menu@0.11.0
  - @dxos/keyboard@0.11.0
  - @dxos/effect@0.11.0
  - @dxos/errors@0.11.0
  - @dxos/i18n@0.11.0
  - @dxos/invariant@0.11.0
  - @dxos/progress@0.11.0
