# @dxos/plugin-space

## 0.12.0

### Minor Changes

- 4ececc6: Projects and chat sessions can be archived. An archived object leaves the navigation tree but stays
  listed in the space's Database section, where its card shows an "Archived" badge and an Unarchive
  action. Types opt in with `ArchivableAnnotation`; the archive state is `ArchivedAnnotation` in the
  object's meta. `Filter.annotation(annotation)` matches entities carrying any meta annotation, and
  `Filter.annotation(annotation, value)` those whose scalar value is equal, in memory and in SQL.
- 28b7621: Offer themed space templates in the create-space dialog, contributed by any plugin through `AppCapabilities.SpaceTemplate` and built with `@dxos/app-toolkit/SampleSpace`; the onboarding space is one of them, built on demand rather than imported from a bundled archive. Breaking: `ClientEvents.SpacesReady` is now `SpacesAvailable`, and `AppSpace.SAMPLE_SPACE_TAG`/`isSampleSpace` are gone — a space records the template it came from in `AppAnnotation.SpaceTemplateAnnotation` instead.
- 6ef35a6: `Annotation.SetParent` takes options: `set()` makes a field its targets' parent, and `set({ override: false })` claims only targets that have no parent yet, so an object can be listed in several places while one of them owns it. An outgoing reference traversal now returns each array's targets in array order. Collections and project artifacts use this: an object created in a project is filed only there, and a collection that merely lists an object offers Show original and Remove instead of Delete. Breaking: replace `Annotation.SetParent.set(true)` with `Annotation.SetParent.set()`.
- a09e18e: `CreateObjectResult.object` is now optional, and so is the value a `CreateEntryOverride.createObject` resolves to. Some creates legitimately finish without an object: the connector create hands off to an OAuth popup or a credential dialog, and the `Connection` appears later, out of band.

  The contract previously demanded an object, so `plugin-connector` satisfied it with `undefined as unknown as Obj.Unknown` — and every caller that trusted the type then crashed on it. Creating a Connection threw `Invalid argument 'object': expected object` from `Obj.getURI` as the create-object dialog tried to navigate to the thing that did not exist yet. The three call sites that dereferenced the result (`ObjectFormDialog`, the database app-graph-builder extension, and `DefaultProperties`) now check before navigating; `RefField` already did.

  Implementors returning a real object are unaffected. Callers reading `result.object` must now handle `undefined`.

- a3d45c4: Hide objects from the collection tree when their type is not available in the build, and hide the plugin-registry button in builds without the registry. `Skill`, `Agent` and `Sequence` icons now share the amber hue of `Session`, `Project` and `Routine`, and a curated build no longer offers creating the unfinished `Agent` and `Sequence` types (`AssistantPluginOptions.experimentalTypes`).
- b9d72bb: Reclaim garbage-collected ECHO documents on every peer, and collect objects that were only transitively deleted. `db.runGarbageCollection()` now also sweeps children of deleted parents and relations with a deleted endpoint — objects that query as deleted without carrying a `deleted` flag of their own — and wipes each document's subduction records, which hold most of its bytes. Documents that leave a space directory are wiped locally as the unlink replicates, so one explicit collection frees disk everywhere. Adds `db.retainObjects(keep)`, which replaces the set of objects the space directory tracks by diffing the retained ids against the directory's own maps — clearing a space is now one root change plus a collection, rather than a query over its contents and a soft delete per object. `SpaceOperation.RemoveAllObjects` is built on it and no longer offers undo. Adds `SpaceOperation.CollectGarbage`.
- 77a2d34: Replace `SpaceOperation.OpenCreateObject` with `SpaceOperation.OpenObjectForm`, which returns a reference to the object the user confirmed (or nothing if the dialog was dismissed) instead of taking an `onCreateObject` callback. It also accepts a `schema` for callers with an ad-hoc form schema, and a `mode: 'live'` that adds the object to the database before the form opens — so fields resolving against the database behave as they do after creation — and removes it again on dismissal. This is a breaking rename: replace `OpenCreateObject` with `OpenObjectForm` and `initialFormValues` with `defaults`. A form whose root is a discriminated union now opens on the union's first member, and the required-field asterisk clears once a field holds a value.
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

- b72c1a2: Every `LayoutOperation.Open` caller now passes the qualified id of a node the app graph builds, so these opens land on their plank instead of doing nothing: trace-panel links, clipped pages, the routines settings panel (from mailbox, calendar and feed properties and from trigger templates), a newly opened folder (now a workspace switch), messages and events opened from a mailbox or calendar rendered without an `attendableId`, and anything opened from the spotlight window, whose forwarder now passes the whole `Open` input through. The generic database path plugin-space resolves for an object of a stored schema uses the schema's entity id, which is how the database section keys it, and `SpaceOperation.Create` returns the new space's Home path as its `subject`.

  Debug pages have no URL, so `Open` cannot reach them. The debug panel now passes `DebugSurface.PageData`, article data with an `onNavigate(nodeId)` that shows another page, and every page under `root/debug`, in plugin-debug and devtools, registers on the `DebugSurface.Page` role (`org.dxos.plugin.debug.surface.page`) instead of the article role. A plugin that adds a page to the debug panel must register it on that role.

  Breaking: `SettingsPath.getPluginRegistrySectionPath` is removed, along with plugin-settings' `OpenPluginRegistry` handler, which opened a path nothing builds. To open the registry, invoke `SettingsOperation.OpenPluginRegistry` (from `@dxos/app-toolkit/SettingsOperation`, no input); plugin-registry's handler switches to the registry workspace. A build without plugin-registry has no handler for it, so `SettingsOperation.isPluginRegistryAvailable(enabled)` says whether to offer it; the plugin-failure toast drops its registry action when it returns false. The waiting-for-object toast is removed with `SpaceOperation.WaitForObject` and the space plugin's `awaiting` state: the deck already shows a plank that is still loading and fills it in when the object arrives.

- 064a184: `SpaceOperation.DeleteField`, `SpaceOperation.RestoreField`, `KanbanOperation.DeleteCardField`, `KanbanOperation.RestoreCardField` and `TableOperation.AddRow` take the view as a reference (`Ref.Ref(View.View)`) rather than the view object, so their serialized schemas no longer embed the whole View type. Breaking: callers pass `Ref.make(view)`.
- 5662dfc: Render avatar fallbacks whose emoji rely on a variation selector (☀️, ⚙️, ♻️ …) instead of a coloured circle with no symbol. Spaces that are listed but not yet open now hold a place in the sidebar rail, and the account corner holds a plain circle while the client initialises.
- 20e86ba: The Related Objects companion now filters by type: its toolbar offers one toggle per type actually present in the related set, labelled with the type's own icon, label and count, and hidden entirely when there is nothing to narrow. The choice is per-record view state, so the record article's inline Related section — which has no toolbar of its own — narrows with it.

  This replaces the hardcoded exclusion of `org.dxos.type.text` and `org.dxos.type.assistant.chat` from related results; both types are now shown and can be filtered out by the user. Types annotated hidden remain excluded and are never offered as an option. A related-object list no longer includes the subject itself.

- d7bec53: `SpaceOperation.RemoveObjects` now declares `Database.Service`, so a caller must pass `spaceId` in the invoke options: `invokePromise(SpaceOperation.RemoveObjects, { objects }, { spaceId })`. A call without one fails to resolve the service. Every in-repo call site passes it.

  This fixes removal on hosts that have no client `Space`, such as edge operation-service behind composer.dxos.network/mcp, where every `removeObjects` call failed its invariant and nothing was removed.

- 678ba58: App configuration moves out of the personal space and into a dedicated **settings space**, and the personal space becomes an ordinary space.

  The settings space is tagged `org.dxos.space.settings`, locked at genesis so it can never be shared, EDGE-replicated so it follows the user across devices, and hidden from the navtree. It holds the cross-space navtree ordering, the Welcome-dismissed flag, and a new **personal space** setting that stores the id of the space to use as the default target for unscoped content (quick entry, chat, preview and entity lookup). That setting can be repointed at any space from Settings → Your spaces.

  A one-time migration runs on `SpacesReady`: it creates the settings space if absent, copies the space ordering across, designates the existing personal space, and stamps `Personal` into that space's `properties.name` (the display name used to come from a translation).

  `AppSpace.PERSONAL_SPACE_TAG` is deprecated — new profiles no longer set it, and it resolves legacy profiles only. `isPersonalSpace`, `setPersonalSpace` and `resolvePersonalSpace` are renamed to `isLegacyPersonalSpace`, `setLegacyPersonalSpace` and `resolveLegacyPersonalSpace`; `getPersonalSpace` keeps its name but now resolves the setting first. New: `SETTINGS_SPACE_TAG`, `isSettingsSpace`, `getSettingsSpace`, `readPersonalSpaceId`, `setPersonalSpaceId`.

  The space creation dialog gains a **Private space** toggle (default off, ahead of the EDGE replication toggle) which locks membership at genesis. Space sharing UI now keys off `space.membershipPolicy` rather than the personal-space tag, so the Members panel is hidden for any private space, not just the personal one. Renaming, re-iconing and deleting the personal space are no longer blocked, except that the space currently designated as personal still cannot be deleted.

  `HelpOperation.HideWelcome` no longer takes a `space` — the flag is app-wide. It is not migrated, so a dismissed welcome carousel reappears once.

- 6fed038: Add people you already share a space with to another space: a contact picker on the space members
  article admits them by identity key and returns a `?spaceKey=` join link that brings the guest into
  the space, and the account profile gains a Contacts article. `space.admitContact(contact, role?)`
  takes a role, defaults to Editor instead of Admin, and records the contact's profile; `Contact`
  carries the contact's `did`. `Combobox.Item` forwards extra props, and `Listbox.ItemContent` sizes
  its icon column to wider icons and accepts block content in `description`.

  Breaking: `Clipboard` (`Clipboard.Button`, `Clipboard.IconButton`, `Clipboard.Provider`) and
  `useClipboard` are removed from `@dxos/react-ui`; use `SystemIconButton.Clipboard` with `value` (or
  `onCopy`), adding `iconOnly` for the icon-only form. It needs no provider.

- 77d0026: Added a `RemoveAllObjects` space operation that removes every object from a space except its `SpaceProperties`, emptying the root collection.
- 6a1ec57: Add `Task.attachments`, files a task owns, with `Task.addAttachment`/`Task.removeAttachment` recording each change in the task's history, and the `tasks.addAttachment`/`tasks.removeAttachment` operations. Where plugin-file is installed, files dropped or pasted onto a task's article are stored and attached, with a placeholder card while each uploads and "Remove attachment" in the card's menu.

  `CardMasonry` (plugin-space) is now exported from `@dxos/plugin-space/components`, and `AppSurface.CardMasonryData` gains `size: 'compact'` (cards at three quarters, so a companion fits two columns), `inline` (in the host's flow rather than its own scroller), `pending` placeholder cards, and `CardMenu`, through which a host adds items to each card's menu. The `cardMasonry` surface now activates when requested on its own. A task's attachments and artifacts render through it.

  Image file cards fill the card; agent assignees use a robot glyph; tags centre their content.

  A task delegated to a chat is marked failed when the chat's model request fails, rather than staying started: `DelegationStrategy` gains an optional `onTurnFailed` hook, called when a turn fails (not when it is interrupted), and the supervisor fails the tasks the conversation holds, recording the error in the task's history. Delegating to a chat now names the chat as the assignee's `subject`, so the supervisor no longer mistakes the task for an orphaned sub-agent's; an agent standing for a non-session object reads as "Agent" rather than an id.

  A role-gated surface module (`AppCapability.surface` with `roles`) now logs an error when it loads if one of its surfaces binds a role it did not declare — the omission that left the `cardMasonry` surface unrendered wherever it was requested on its own.

- 5dedae9: A task list's toolbar gains a status selector: a menu of checkboxes, one per status, choosing which statuses the list shows. Hiding a status hides the tasks filed under it too — a sub-task is part of the work its parent stands for — while the query beside it still keeps the ancestors of a match, so searching a narrowed list cannot bring a hidden branch back. Clearing the filter restores every status.

  Arrow keys move through a task list without selecting, and `Enter` opens the focused row. Selecting a task opens its detail, so following focus opened the detail of every row a reader passed on the way to the one they wanted.

  A `cardMasonry` surface renders a list of objects as cards — `plugin-space` implements it, and a host supplies what belongs in the grid rather than the surface deriving it from a subject. A task's companion uses it to show the task's artifacts beneath its editor. Cards also sit a step above the surface behind them (`--color-card-surface` moves to the raised level), so an unbordered card is legible against the plank it is on.

  A windowed tree fills its container again: the row window was positioned with `inline-start-0`/`inline-end-0`, utilities the Tailwind v4 migration dropped, so it had no insets and shrink-wrapped its rows to the width it first measured — a task list or navtree in a wide plank kept a narrow column of rows.

- c209b42: Breaking: static types are hidden unless they opt in with `Annotation.UserType.set()` (types persisted in a space are always shown), and `HiddenAnnotation` and `CollectionItemAnnotation` are removed; mark collection items with `Annotation.UserType.set({ tags: [Collection.ItemTag] })` instead. Collections now accept any user-facing object, objects gain an Add to collection action, `AppCapabilities.DefaultParent` rules decide where an object created without a target is filed (`SpaceOperation.AddObject` consults them and now declares `Capability.Service`), and clicking an object's copy in another collection opens it there.
- 79d5ecf: Project host discovery as operations: `queryPlugins` (plugin-registry, on a new Registry skill), and `queryTypes` now reports each type's version and covers the host registry as well as the space. Invoking an operation that needs no space no longer fails on a session with no spaces. **Breaking:** `invokeOperation` no longer falls back to the session's first space — a space comes only from the call's `spaceId`, an operation's own `spaceId` field, or a space-qualified reference in its arguments, and an operation that acts on a space is refused when the call names none. `McpServer.resolveSpaceId` takes a `{ required }` option accordingly.

### Patch Changes

- 4862c8e: Fix type-safety and code-quality issues found by an automated code review: eliminated unsafe type casts across compute, echo, and UI-editor packages, normalized half-applied namespace-import usage, replaced flaky sleep-based test synchronization with deterministic waits, and cleaned up duplicated Effect service-layer wiring.
- 6186edc: Fix several surfaces that stayed blank or stale on a cold load because a `Ref`'s `.target` was read without subscribing to it first, a tldraw grid-mode toggle that silently failed to persist, and dozens of invented Tailwind class names that rendered as unstyled text.

  Breaking: `Calendar.Root`'s props (`@dxos/react-ui`) no longer accept `className` — pass `classNames` instead. `@dxos/progress`'s exported `ProgressSnapshot`/`ProgressApi` types are renamed to `Progress.Snapshot`/`Progress.Api`.

- 938bd20: The space dashboard no longer queries every object in the active space unless a peripheral needs it. Stream Deck reads it only while its bridge is connected, and LaMetric only while a device is configured.
- 252ca39: A feed append that keeps failing is retried on its backoff only: `db.flush()` and new writes wait for the scheduled retry instead of resending at once, so a persistent storage failure no longer turns every flush into a burst of sends. Errors that cross a service RPC keep their cause chain in the stack, and the space save indicator reports a failed flush as unsaved instead of raising an unhandled rejection.
- cafa240: Fix fresh onboarding creating a duplicate settings space: the settings-space bootstrap now waits for the genesis-created space instead of racing its creation, and profiles already carrying a duplicate resolve the space holding the default-space designation as canonical.
- 279f87b: "Go to connection" on a rejected GitHub token now opens the connection whose token failed, and a navigation error after a successful space import no longer reports the import as failed.
- d90fe83: Modules that require app-shell capabilities (`Client`, attention view state, the app graph) are excluded from the generated capability barrels, so a non-browser host activates these plugins without `MissingProviderError` dependency-graph failures. This covers Node as well as workerd: a Node host no longer activates `NavigationTargetResolver`, `AppGraphBuilder` or `CompanionChatProvisioner`. The browser is unaffected — it resolves the plugin's own `capabilities/index.ts` rather than a generated barrel.
- 9426389: Fix how an operation reads its input and reports a bad one.

  A multi-word text search now narrows instead of widening: the phrase goes to the index whole, where
  the terms are ANDed, rather than being split and OR-ed back together.

  An operation input carrying a property its schema does not declare is now rejected rather than
  dropped, so a misspelled field is an error instead of a plausible-looking wrong answer. An operation
  whose input requires no fields still accepts a no-argument invocation.

  A wire reference reaches a handler decoded when its field is both optional and nullable, so a ref
  field can be set over the wire and not only cleared.

  A rejected reference now names the type expected and the value received, instead of `<Declaration>`,
  and every bad field in a payload is reported at once.

  Loading an object by its own id no longer hangs when a strong dependency of its type is unreachable.

- 256f286: Projects gain a lifecycle `status` field (`active | paused | blocked | ended`), surfaced through the MCP-projected verbs, and plugin-projects ships a project-management skill for external agents — including the `/codeProject setup` flow that binds a repo to an existing space. The skill's key segment is `codeProject` because the segment doubles as the projected MCP prompt name and plain `project` belongs to assistant-toolkit's own skill.

  `toEffectSchema` recognizes ECHO's reference sentinel before the generic `type: 'object'` branch, so a reference node widened with structural keywords (as a wire boundary may do for schema-unaware consumers) decodes as a reference instead of a plain struct. Serialization is unchanged — persisted schemas stay byte-identical to previous releases.

  Worker (`workerd`) bundles no longer pull in React. Wrangler resolves `workerd, worker, browser` and never `node`, so a `#capabilities` map offering only `node` and `default` handed workers the browser barrel and its React surfaces. Every plugin with a headless entry now resolves a server-safe barrel under a `workerd` condition, and the `check-module-structure` guards trace with `workerd,worker` — the conditions a worker actually resolves — so a reintroduced leak fails the check instead of passing against a build that is never shipped.

- 3b09a05: `space.queryObjects` now returns `truncated` alongside `results`, so a page capped by `limit` (default 10) can be told from the whole set rather than being read as complete.
- fa79a0e: The object menu offers "Remove from collection" for objects the collection owns, not only ones it links to. Removing an owned object moves it to the space root instead of deleting it. Delete is still only offered for owned objects, and "Show original" only for linked ones.
- efa7836: Fix settings-space duplication on replicating devices, and heal profiles that already carry duplicates.

  Spaces replicate to a freshly joined or recovered device in creation order, so the legacy personal space always landed before the settings space — and because the legacy tag is immutable and outlives migration, the bootstrap concluded "unmigrated legacy profile" and created another settings space on every such boot, which then replicated to every device.

  Absence is unprovable in an eventually-consistent system, so instead of guarding the create the profile now converges. The survivor is the lowest-id tagged space — a pure function of replicated state, so every device picks the same winner and no device can ever tombstone it. Once the survivor is ready, each duplicate's configuration (properties annotations, including the default-space designation, plus the cross-space ordering) is folded into it and the duplicate is tombstoned, which replicates to the user's other devices; a duplicate holding content the salvage does not recognize is kept rather than destroyed.

- 66e5008: The space home page no longer shows the Activity section, which stalled the main thread in large spaces. It will come back once its statistics are computed off the main thread.
- ff45e97: The space home Activity section is back. Its counts and heatmap now come from host-side aggregates, so opening a large space no longer loads every object into the page; the same counts feed the Stream Deck and LaMetric displays.
- baa40a1: Report worker and client startup failures instead of hanging: leader sessions that close or time out release their worker, a worker runtime that fails to start rejects the connection, `ClientProvider` throws initialization errors to the error boundary, an RPC handler defect fails only its own request, and a failed space initialization settles `createSpace` and `waitUntilReady`.
- Updated dependencies [a92ea18]
- Updated dependencies [0280a6a]
- Updated dependencies [5a0fc35]
- Updated dependencies [0c6c186]
- Updated dependencies [86d1482]
- Updated dependencies [af1c007]
- Updated dependencies [4862c8e]
- Updated dependencies [106d38a]
- Updated dependencies [9049c30]
- Updated dependencies [6186edc]
- Updated dependencies [b7d66c8]
- Updated dependencies [e3ceced]
- Updated dependencies [6a457ac]
- Updated dependencies [e2eecf2]
- Updated dependencies [2800d03]
- Updated dependencies [4ececc6]
- Updated dependencies [96f94c2]
- Updated dependencies [c95def4]
- Updated dependencies [b47fd84]
- Updated dependencies [3c7b013]
- Updated dependencies [fd873d2]
- Updated dependencies [f4e481a]
- Updated dependencies [b1dc20c]
- Updated dependencies [ac71815]
- Updated dependencies [7c87626]
- Updated dependencies [c020513]
- Updated dependencies [6388838]
- Updated dependencies [f82c78f]
- Updated dependencies [1a8043c]
- Updated dependencies [6d52561]
- Updated dependencies [520c34f]
- Updated dependencies [28b7621]
- Updated dependencies [9714c75]
- Updated dependencies [3b78bb6]
- Updated dependencies [e954c0f]
- Updated dependencies [9ef5485]
- Updated dependencies [22bea85]
- Updated dependencies [a069511]
- Updated dependencies [066b35d]
- Updated dependencies [5df602e]
- Updated dependencies [63fc847]
- Updated dependencies [b4ceea2]
- Updated dependencies [bdb02cd]
- Updated dependencies [48eb05d]
- Updated dependencies [4a0b78b]
- Updated dependencies [2d58ea5]
- Updated dependencies [34a8433]
- Updated dependencies [bd6ba8e]
- Updated dependencies [0fe00c5]
- Updated dependencies [b8762ef]
- Updated dependencies [f3f55a8]
- Updated dependencies [85ad256]
- Updated dependencies [2d4107f]
- Updated dependencies [c56ba34]
- Updated dependencies [ea4093c]
- Updated dependencies [069e8ed]
- Updated dependencies [7becabf]
- Updated dependencies [73daef4]
- Updated dependencies [75971ad]
- Updated dependencies [3958355]
- Updated dependencies [fee7666]
- Updated dependencies [fd23a8b]
- Updated dependencies [4e417e9]
- Updated dependencies [7d04444]
- Updated dependencies [194b1d3]
- Updated dependencies [d194929]
- Updated dependencies [6ef35a6]
- Updated dependencies [557e243]
- Updated dependencies [864cd0d]
- Updated dependencies [ea11703]
- Updated dependencies [5305365]
- Updated dependencies [9c86066]
- Updated dependencies [b2caee6]
- Updated dependencies [9baf25f]
- Updated dependencies [5dc2419]
- Updated dependencies [a09e18e]
- Updated dependencies [a3d45c4]
- Updated dependencies [dcf911b]
- Updated dependencies [881f900]
- Updated dependencies [b83b831]
- Updated dependencies [dd17e57]
- Updated dependencies [6d28380]
- Updated dependencies [6af89f4]
- Updated dependencies [329faa0]
- Updated dependencies [d770fe7]
- Updated dependencies [da37a13]
- Updated dependencies [0a01ff7]
- Updated dependencies [1c995c4]
- Updated dependencies [6f4a887]
- Updated dependencies [ab56cfe]
- Updated dependencies [7ec1738]
- Updated dependencies [df295b2]
- Updated dependencies [d0beedc]
- Updated dependencies [731b264]
- Updated dependencies [a69d861]
- Updated dependencies [ba08e65]
- Updated dependencies [2643a00]
- Updated dependencies [dbff1e4]
- Updated dependencies [3ee20ca]
- Updated dependencies [9817b6f]
- Updated dependencies [f38f3ae]
- Updated dependencies [07565c8]
- Updated dependencies [5fcd238]
- Updated dependencies [5e8878c]
- Updated dependencies [6409948]
- Updated dependencies [792c756]
- Updated dependencies [1cf6347]
- Updated dependencies [0cde959]
- Updated dependencies [e094f74]
- Updated dependencies [9ab38fa]
- Updated dependencies [99dcc7c]
- Updated dependencies [b3673ee]
- Updated dependencies [23d2d8c]
- Updated dependencies [915db6a]
- Updated dependencies [3e02201]
- Updated dependencies [2e4c299]
- Updated dependencies [a3b6ef0]
- Updated dependencies [782a442]
- Updated dependencies [b02fe16]
- Updated dependencies [f0d3620]
- Updated dependencies [472ca95]
- Updated dependencies [49271cd]
- Updated dependencies [0426925]
- Updated dependencies [252ca39]
- Updated dependencies [8fb29b3]
- Updated dependencies [c439ba0]
- Updated dependencies [6af130f]
- Updated dependencies [c8b7158]
- Updated dependencies [2c442f9]
- Updated dependencies [0264069]
- Updated dependencies [2922d36]
- Updated dependencies [d62a947]
- Updated dependencies [872f391]
- Updated dependencies [bd792a6]
- Updated dependencies [8608f03]
- Updated dependencies [51820a1]
- Updated dependencies [9ae0e5f]
- Updated dependencies [7d000b9]
- Updated dependencies [e56276b]
- Updated dependencies [66e9264]
- Updated dependencies [cafa240]
- Updated dependencies [813069c]
- Updated dependencies [84362af]
- Updated dependencies [76d6fca]
- Updated dependencies [4c107a2]
- Updated dependencies [26e31c1]
- Updated dependencies [8c20ee2]
- Updated dependencies [b9d72bb]
- Updated dependencies [9477170]
- Updated dependencies [eeff74c]
- Updated dependencies [251f586]
- Updated dependencies [3c85350]
- Updated dependencies [967b130]
- Updated dependencies [75d9c7c]
- Updated dependencies [0ef896f]
- Updated dependencies [777d24a]
- Updated dependencies [d2f3d87]
- Updated dependencies [48fd9fe]
- Updated dependencies [3e9a10f]
- Updated dependencies [8ea2bf9]
- Updated dependencies [5cf307d]
- Updated dependencies [48ea128]
- Updated dependencies [8ca2ac7]
- Updated dependencies [2c06e2e]
- Updated dependencies [098a0bb]
- Updated dependencies [72f7584]
- Updated dependencies [e94ed89]
- Updated dependencies [882ac2a]
- Updated dependencies [0132aab]
- Updated dependencies [a74e9b0]
- Updated dependencies [3ea0b0f]
- Updated dependencies [47c8d7e]
- Updated dependencies [10b1239]
- Updated dependencies [851791f]
- Updated dependencies [9c86066]
- Updated dependencies [608a172]
- Updated dependencies [5180720]
- Updated dependencies [b600f72]
- Updated dependencies [99e323d]
- Updated dependencies [ea11703]
- Updated dependencies [bf4f1e6]
- Updated dependencies [cc45381]
- Updated dependencies [bcfe4c5]
- Updated dependencies [12b6618]
- Updated dependencies [df0ab57]
- Updated dependencies [ce194c0]
- Updated dependencies [818a096]
- Updated dependencies [4aa6a33]
- Updated dependencies [0ac2e5f]
- Updated dependencies [9426389]
- Updated dependencies [2e5e188]
- Updated dependencies [ebb8f4a]
- Updated dependencies [4f760ce]
- Updated dependencies [9d2466a]
- Updated dependencies [557e243]
- Updated dependencies [ca34a80]
- Updated dependencies [9f2557b]
- Updated dependencies [29543ca]
- Updated dependencies [e26af7e]
- Updated dependencies [ab79741]
- Updated dependencies [08cddf6]
- Updated dependencies [c0e5651]
- Updated dependencies [3214dcf]
- Updated dependencies [8efc4f1]
- Updated dependencies [df22dec]
- Updated dependencies [8cec4c2]
- Updated dependencies [a283607]
- Updated dependencies [24fcadc]
- Updated dependencies [1160094]
- Updated dependencies [77a2d34]
- Updated dependencies [b00ee72]
- Updated dependencies [5ae704b]
- Updated dependencies [4804da0]
- Updated dependencies [61fe676]
- Updated dependencies [2bb84d8]
- Updated dependencies [d4b4919]
- Updated dependencies [63e500b]
- Updated dependencies [b72c1a2]
- Updated dependencies [7c426d4]
- Updated dependencies [cd4da46]
- Updated dependencies [78e5596]
- Updated dependencies [b1bb838]
- Updated dependencies [19f19a2]
- Updated dependencies [5959b41]
- Updated dependencies [2a41efd]
- Updated dependencies [139a3b0]
- Updated dependencies [987f7e1]
- Updated dependencies [142ba02]
- Updated dependencies [1ab4bb8]
- Updated dependencies [e1ee9dd]
- Updated dependencies [a78a66d]
- Updated dependencies [a5dfa5e]
- Updated dependencies [32468c3]
- Updated dependencies [0a3e9dd]
- Updated dependencies [e2b04f6]
- Updated dependencies [256f286]
- Updated dependencies [4689d66]
- Updated dependencies [306f50d]
- Updated dependencies [8f372ce]
- Updated dependencies [6c881a2]
- Updated dependencies [690dcaa]
- Updated dependencies [e207c68]
- Updated dependencies [092f3be]
- Updated dependencies [b7822a7]
- Updated dependencies [cc9b81f]
- Updated dependencies [c8b65f3]
- Updated dependencies [9feee5e]
- Updated dependencies [f2d8a92]
- Updated dependencies [0e44f24]
- Updated dependencies [bd06669]
- Updated dependencies [c4188a6]
- Updated dependencies [5b504b4]
- Updated dependencies [eb95cd7]
- Updated dependencies [a53cabb]
- Updated dependencies [d7b0a3b]
- Updated dependencies [1482a3f]
- Updated dependencies [a574300]
- Updated dependencies [4663f24]
- Updated dependencies [2513a52]
- Updated dependencies [2896a58]
- Updated dependencies [5a00dcb]
- Updated dependencies [17ed864]
- Updated dependencies [1d6f730]
- Updated dependencies [f81a4f0]
- Updated dependencies [6668dba]
- Updated dependencies [b125655]
- Updated dependencies [f962a7d]
- Updated dependencies [9996125]
- Updated dependencies [9e91762]
- Updated dependencies [4f55909]
- Updated dependencies [f4c2702]
- Updated dependencies [2df0297]
- Updated dependencies [3e08678]
- Updated dependencies [dea5df9]
- Updated dependencies [7407d65]
- Updated dependencies [318bbad]
- Updated dependencies [fc83abd]
- Updated dependencies [9a3f01e]
- Updated dependencies [178bc6d]
- Updated dependencies [58b59d7]
- Updated dependencies [efa7836]
- Updated dependencies [678ba58]
- Updated dependencies [8904184]
- Updated dependencies [e680b16]
- Updated dependencies [a805212]
- Updated dependencies [dd039d2]
- Updated dependencies [6fed038]
- Updated dependencies [adcad97]
- Updated dependencies [f8bfba0]
- Updated dependencies [97b247c]
- Updated dependencies [e288833]
- Updated dependencies [ea11703]
- Updated dependencies [fa82aef]
- Updated dependencies [56276cd]
- Updated dependencies [886453b]
- Updated dependencies [0280a6a]
- Updated dependencies [18597fc]
- Updated dependencies [9205bd3]
- Updated dependencies [fce2060]
- Updated dependencies [582fc22]
- Updated dependencies [892b718]
- Updated dependencies [bda45ac]
- Updated dependencies [63629c5]
- Updated dependencies [5885380]
- Updated dependencies [881f900]
- Updated dependencies [6a1ec57]
- Updated dependencies [1957b39]
- Updated dependencies [e3d7a8c]
- Updated dependencies [d8e9de1]
- Updated dependencies [0c92b44]
- Updated dependencies [72b2984]
- Updated dependencies [5dedae9]
- Updated dependencies [693d1b4]
- Updated dependencies [32584c9]
- Updated dependencies [32353e6]
- Updated dependencies [3ea8217]
- Updated dependencies [559acfa]
- Updated dependencies [1862edc]
- Updated dependencies [631df48]
- Updated dependencies [97efbaa]
- Updated dependencies [e8088ea]
- Updated dependencies [bb94124]
- Updated dependencies [928e0b2]
- Updated dependencies [1a3de22]
- Updated dependencies [5d816a6]
- Updated dependencies [85e6347]
- Updated dependencies [4c5b2c7]
- Updated dependencies [f9816c0]
- Updated dependencies [78523d2]
- Updated dependencies [6fd2a5d]
- Updated dependencies [525aee0]
- Updated dependencies [a20d4d9]
- Updated dependencies [06cbe76]
- Updated dependencies [40b50c2]
- Updated dependencies [f112c37]
- Updated dependencies [8048e42]
- Updated dependencies [520c34f]
- Updated dependencies [4ae2005]
- Updated dependencies [605455c]
- Updated dependencies [ff93962]
- Updated dependencies [9d8fcbd]
- Updated dependencies [85bdad2]
- Updated dependencies [a1d42c4]
- Updated dependencies [4a10672]
- Updated dependencies [ee180f6]
- Updated dependencies [c209b42]
- Updated dependencies [eda8b55]
- Updated dependencies [11de244]
- Updated dependencies [cc11297]
- Updated dependencies [ff37699]
- Updated dependencies [6dadb41]
  - @dxos/echo@0.12.0
  - @dxos/app-framework@0.12.0
  - @dxos/app-toolkit@0.12.0
  - @dxos/react-ui-dashboard@0.12.0
  - @dxos/client@0.12.0
  - @dxos/ui-theme@0.12.0
  - @dxos/echo-protocol@0.12.0
  - @dxos/schema@0.12.0
  - @dxos/compute@0.12.0
  - @dxos/react-ui@0.12.0
  - @dxos/react-ui-components@0.12.0
  - @dxos/effect@0.12.0
  - @dxos/app-graph@0.12.0
  - @dxos/graph@0.12.0
  - @dxos/react-ui-attention@0.12.0
  - @dxos/protocols@0.12.0
  - @dxos/client-protocol@0.12.0
  - @dxos/echo-client@0.12.0
  - @dxos/types@0.12.0
  - @dxos/plugin-client@0.12.0
  - @dxos/cli-util@0.12.0
  - @dxos/react-ui-list@0.12.0
  - @dxos/react-ui-mosaic@0.12.0
  - @dxos/react-ui-form@0.12.0
  - @dxos/errors@0.12.0
  - @dxos/util@0.12.0
  - @dxos/halo@0.12.0
  - @dxos/shell@0.12.0
  - @dxos/async@0.12.0
  - @dxos/log@0.12.0
  - @dxos/react-ui-menu@0.12.0
  - @dxos/plugin-settings@0.12.0
  - @dxos/plugin-observability@0.12.0
  - @dxos/ui-types@0.12.0
  - @dxos/context@0.12.0
  - @dxos/react-ui-search@0.12.0
  - @dxos/extractor@0.12.0
  - @dxos/echo-react@0.12.0
  - @dxos/migrations@0.12.0
  - @dxos/react-client@0.12.0
  - @dxos/react-ui-table@0.12.0
  - @dxos/plugin-attention@0.12.0
  - @dxos/plugin-graph@0.12.0
  - @dxos/plugin-status-bar@0.12.0
  - @dxos/react-ui-dnd@0.12.0
  - @dxos/react-ui-masonry@0.12.0
  - @dxos/react-ui-pickers@0.12.0
  - @dxos/halo-react@0.12.0
  - @dxos/keys@0.12.0
  - @dxos/display-name@0.12.0
  - @dxos/invariant@0.12.0
  - @dxos/progress@0.12.0

## 0.11.1

### Patch Changes

- @dxos/app-framework@0.11.1
- @dxos/app-toolkit@0.11.1
- @dxos/async@0.11.1
- @dxos/cli-util@0.11.1
- @dxos/client@0.11.1
- @dxos/client-protocol@0.11.1
- @dxos/compute@0.11.1
- @dxos/context@0.11.1
- @dxos/display-name@0.11.1
- @dxos/echo@0.11.1
- @dxos/echo-client@0.11.1
- @dxos/echo-react@0.11.1
- @dxos/effect@0.11.1
- @dxos/errors@0.11.1
- @dxos/extractor@0.11.1
- @dxos/halo@0.11.1
- @dxos/halo-react@0.11.1
- @dxos/invariant@0.11.1
- @dxos/keys@0.11.1
- @dxos/log@0.11.1
- @dxos/migrations@0.11.1
- @dxos/protocols@0.11.1
- @dxos/react-client@0.11.1
- @dxos/react-ui@0.11.1
- @dxos/react-ui-attention@0.11.1
- @dxos/react-ui-components@0.11.1
- @dxos/react-ui-dashboard@0.11.1
- @dxos/react-ui-dnd@0.11.1
- @dxos/react-ui-form@0.11.1
- @dxos/react-ui-list@0.11.1
- @dxos/react-ui-masonry@0.11.1
- @dxos/react-ui-menu@0.11.1
- @dxos/react-ui-mosaic@0.11.1
- @dxos/react-ui-pickers@0.11.1
- @dxos/react-ui-search@0.11.1
- @dxos/react-ui-table@0.11.1
- @dxos/react-ui-tabs@0.11.1
- @dxos/schema@0.11.1
- @dxos/shell@0.11.1
- @dxos/types@0.11.1
- @dxos/ui-theme@0.11.1
- @dxos/ui-types@0.11.1
- @dxos/util@0.11.1
- @dxos/plugin-attention@0.11.1
- @dxos/plugin-client@0.11.1
- @dxos/plugin-graph@0.11.1
- @dxos/plugin-observability@0.11.1
- @dxos/plugin-settings@0.11.1
- @dxos/plugin-status-bar@0.11.1

## 0.11.0

### Minor Changes

- 179afc6: Add `dx space export` and `dx space import` commands. Export writes a space archive to disk in either the binary storage-dump format (includes document history) or a JSON snapshot of current object state; import reads an archive of either format back as a new space.

### Patch Changes

- 51aaffe: Rename `Message.Content` to `Message.Body` and add a new optional `Message.Content` wrapper that carries the message's default padding. `Card.Root` accepts a `gutter` prop so a card whose body is a form insets its fields like a standalone form.
- 25272e3: Keep the sync status indicator a single colour in every state; the icon and label continue to convey status.
- 0e3a1a9: Distinguish a stalled replication from a lost EDGE connection in the sync status indicator, and stop reporting a stall while replication is still making progress.
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
- Updated dependencies [a77e1a2]
- Updated dependencies [eec72c5]
- Updated dependencies [ed992c2]
- Updated dependencies [e510f3b]
- Updated dependencies [ed992c2]
- Updated dependencies [a83d98a]
- Updated dependencies [fe63f19]
- Updated dependencies [a19443b]
- Updated dependencies [3f1fc67]
- Updated dependencies [6df314a]
- Updated dependencies [962c8cd]
- Updated dependencies [2048cb3]
- Updated dependencies [856c4f0]
- Updated dependencies [382d00d]
- Updated dependencies [382d00d]
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
- Updated dependencies [ba7aabf]
- Updated dependencies [410a019]
- Updated dependencies [d958118]
- Updated dependencies [2a68c3b]
- Updated dependencies [30ae5eb]
- Updated dependencies [6d2afe0]
- Updated dependencies [e65432c]
- Updated dependencies [f6a01e3]
- Updated dependencies [c9651f1]
- Updated dependencies [9cde1c6]
- Updated dependencies [5e7839e]
- Updated dependencies [923d5be]
- Updated dependencies [85893fe]
- Updated dependencies [c727a43]
- Updated dependencies [9f7d5ad]
- Updated dependencies [9ded6b9]
- Updated dependencies [6067460]
- Updated dependencies [717edc0]
- Updated dependencies [12fd785]
- Updated dependencies [51aaffe]
- Updated dependencies [801b77f]
- Updated dependencies [d547045]
- Updated dependencies [bda1a02]
- Updated dependencies [0a4bbde]
- Updated dependencies [832d150]
- Updated dependencies [aea1e6e]
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
- Updated dependencies [55bb048]
- Updated dependencies [c727a43]
- Updated dependencies [14848a1]
- Updated dependencies [4bb7e3b]
- Updated dependencies [179afc6]
- Updated dependencies [4df6cf3]
- Updated dependencies [7b270f2]
- Updated dependencies [686fac1]
- Updated dependencies [ed992c2]
- Updated dependencies [105dac4]
- Updated dependencies [96109be]
- Updated dependencies [37c17cc]
- Updated dependencies [f0ec728]
- Updated dependencies [08a3eea]
- Updated dependencies [bb63d91]
- Updated dependencies [ed992c2]
- Updated dependencies [ed992c2]
- Updated dependencies [c58ebb7]
- Updated dependencies [a49131a]
- Updated dependencies [5585ec8]
- Updated dependencies [4f24c4e]
- Updated dependencies [ac51564]
- Updated dependencies [499dde4]
  - @dxos/echo@0.11.0
  - @dxos/async@0.11.0
  - @dxos/schema@0.11.0
  - @dxos/react-ui-list@0.11.0
  - @dxos/react-ui@0.11.0
  - @dxos/app-toolkit@0.11.0
  - @dxos/plugin-client@0.11.0
  - @dxos/client@0.11.0
  - @dxos/ui-types@0.11.0
  - @dxos/react-ui-search@0.11.0
  - @dxos/echo-client@0.11.0
  - @dxos/compute@0.11.0
  - @dxos/util@0.11.0
  - @dxos/client-protocol@0.11.0
  - @dxos/protocols@0.11.0
  - @dxos/app-framework@0.11.0
  - @dxos/keys@0.11.0
  - @dxos/react-ui-form@0.11.0
  - @dxos/halo@0.11.0
  - @dxos/react-ui-components@0.11.0
  - @dxos/react-ui-attention@0.11.0
  - @dxos/types@0.11.0
  - @dxos/ui-theme@0.11.0
  - @dxos/log@0.11.0
  - @dxos/echo-react@0.11.0
  - @dxos/react-ui-mosaic@0.11.0
  - @dxos/react-ui-masonry@0.11.0
  - @dxos/extractor@0.11.0
  - @dxos/react-client@0.11.0
  - @dxos/shell@0.11.0
  - @dxos/cli-util@0.11.0
  - @dxos/react-ui-tabs@0.11.0
  - @dxos/react-ui-menu@0.11.0
  - @dxos/plugin-status-bar@0.11.0
  - @dxos/migrations@0.11.0
  - @dxos/react-ui-table@0.11.0
  - @dxos/plugin-graph@0.11.0
  - @dxos/plugin-settings@0.11.0
  - @dxos/plugin-attention@0.11.0
  - @dxos/plugin-observability@0.11.0
  - @dxos/react-ui-dashboard@0.11.0
  - @dxos/react-ui-dnd@0.11.0
  - @dxos/react-ui-pickers@0.11.0
  - @dxos/context@0.11.0
  - @dxos/effect@0.11.0
  - @dxos/display-name@0.11.0
  - @dxos/halo-react@0.11.0
  - @dxos/errors@0.11.0
  - @dxos/invariant@0.11.0
