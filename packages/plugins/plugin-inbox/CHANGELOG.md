# @dxos/plugin-inbox

## 0.12.0

### Minor Changes

- 098a0bb: `AnalyzeMailbox` moved from `InboxOperation` to `BrainOperation`, alongside the `FactStore` layer and
  the settings that parameterize it. **Its DXN changed**, so a routine or trigger bound to
  `org.dxos.plugin.inbox.operation.analyzeMailbox` no longer resolves and must be recreated from
  plugin-brain's "Mailbox Facts" template. `createAnalyzeProgressKey` stays in plugin-inbox — every
  monitor key on a mailbox is minted the same way — and the feed-cursor helpers are now exported from
  `@dxos/plugin-inbox/operations`, since a contributed processor keeps its cursor on a feed plugin-inbox
  owns.
- 098a0bb: Fact analysis and the CRM pipeline are now contributed feed processors rather than toolbar menu
  items. plugin-brain contributes the `analyze` pass alongside the `FactStore` layer it needs, so a
  deployment without brain has no analyze pass to run instead of one that dies resolving a service
  nobody provided — the missing-`FactStore` case becomes structurally impossible rather than merely
  handled. plugin-crm's cursored pipeline becomes the `crm` processor declared `after: ['contacts']`,
  consuming plugin-inbox's contact extraction instead of competing with it from a separate button.
  `Process CRM` and `Analyze` are gone from the mailbox menu; `Find images` stays, being space-wide
  rather than a feed pass.
- 592b00e: Mailbox tags now sync **back** to the provider. Starring a message or archiving it (the `inbox` tag
  coming off) reaches Gmail on the next sync, where previously it stayed local and a later sync undid
  it.

  Reconciliation is a three-way merge whose base is the tag index's Automerge heads — recovered with
  `Obj.getVersion` rather than stored as a shadow copy — so no mutation site changes and a crash
  re-derives the same diff instead of diverging. `Cursor.spec` gains `tagHeads`, written together with
  the delta token through the new `Cursor.writeSyncState`; the two describe the same position, and
  advancing one without the other would leave a run diffing a fresh delta against a stale base.

  Which tags participate is the provider's label map inverted, so a user tag is never pushed as a new
  provider label. Gmail's `SPAM` is now mapped onto the canonical `spam` tag in both directions, so its
  spam verdict and `ClassifyMailbox`'s resolve to one tag rather than two parallel notions of junk.
  `TRASH` remains unmapped — deletion is not a tag.

  `MailSyncProviderService` gains an optional `pushTags`, so a provider with no write path (JMAP today)
  degrades to pull-only rather than failing. It reports per-op outcomes: a permanent rejection settles,
  since no retry can help and refusing to advance would block the base forever, while a transient one
  stays pending and holds the base back so the change is retried on a later run.

- 881f900: A bindable type no longer names the connectors that sync it. `ConnectorSync` gains `targetTypename` — the local type a connector binds — and `connectorIdsForTarget` resolves a type's providers from the registered `Connector` capabilities. `Mailbox` and `Calendar` pass it as their `ConnectorAuthAnnotation.connectorIds` resolver instead of listing Gmail, JMAP and Google Calendar by id, which also deletes the three connector-id constants plugin-inbox had been duplicating from the provider plugins and keeping in step by hand.

  The upshot: registering a `Connector` is the only step needed for it to be offered on the types it binds, and a third-party provider can bind a built-in type without the plugin that owns that type knowing the provider exists. `ConnectorAuthAnnotation` already supported a resolver (as `plugin-studio` and `plugin-blogger` use), so no new annotation machinery was needed.

- 098a0bb: `GenerateReply` moved from `InboxOperation` to `BrainOperation`, so **its DXN changed**. Reply
  generation now reaches the message surfaces through a new `InboxCapabilities.ReplyGenerator`
  capability typed against a shared `ReplyGeneration` contract, rather than plugin-inbox naming the
  operation directly — a direct call would invert the plugin dependency, which runs brain → inbox. The
  AI-reply affordance is now absent when no generator is contributed, instead of being offered and
  failing. With this, plugin-inbox no longer depends on `@dxos/pipeline-rdf` at all.
- 3e9a10f: Fix defects found by driving the mailbox against real data.

  - `plugin-inbox`: a conversation tile's overflow menu now offers Archive. It never had one — a threaded
    mailbox renders only conversation tiles, so the entry built by the single-message tile was
    unreachable. Both tiles now share one `buildTileMenuItems`, covered by unit tests.
  - `plugin-inbox`: a message whose sender carries neither name nor address no longer collapses the date
    to the start of its row, and a sender with no display name falls back to its address.
  - `react-ui-card`: `ContactAvatar` centres on the line of text it belongs to. `dx-avatar` is
    `display: contents` and its frame is `inline-flex`, so in a block wrapper the frame sat on the text
    baseline and the line box added descender space beneath it.
  - `react-ui-form`: nested groups in a `settings`-variant form regain the gap between their sub-fields;
    `FormFieldSetContainer` resolved its styles once at module scope and so always used the `default`
    variant.
  - `echo`: `Query.all` gains a typed overload, so a union of same-typed queries stays assignable where
    its arms were rather than widening to `Query.Any`.
  - `plugin-inbox`: a message with no `threadId` (a draft, transcription or assistant-authored message)
    now reaches the mailbox list. The whole-thread semi-join is unioned with the direct matches, since
    `threadId IN (…)` can never admit a threadless row.
  - `react-ui-components`: `QueryEditor` gains `onFilterChange`, handing back the parsed query it was
    already building for its own decorations — `plugin-inbox` and `plugin-explorer` each ran a second
    `QueryBuilder` over the same text, so the DSL was parsed twice per keystroke. Supplying the callback
    is what opts into parsing, so a caller that only wants the text pays nothing. A tag decorates from
    the `#` keystroke and only becomes atomic once a space terminates it (it was unconditionally atomic,
    which swallowed keystrokes mid-label), bracket matching is off so an object literal's braces no
    longer take a background wash while focused, and typenames complete as you type rather than only on
    Ctrl-Space.
  - `plugin-deck`: the leading breadcrumb label no longer shifts as a trail appears or disappears.

- 098a0bb: Inbox surface: virtual folders, archive, and sender enrichment.

  **Inbox and Starred folders** join All Mail / Sent / Drafts / Subscriptions as mailbox child nodes, reusing the existing `properties.filter` + `systemTag` path — no new query machinery.

  **Archive** is available from both the conversation menu and the mailbox tile menu, grouped with Delete since both take a message out of the reading flow. Archiving from a dedicated message view closes the plank; restoring does not.

  Archive is modelled as the `inbox` system tag coming **off**, never a separate `archived` tag: Gmail models INBOX as a label and JMAP as a mailbox role, both already mapped by the providers, so one toggle serves both directions and no filter-complement operator is needed. Note that tag changes are not yet pushed back to the provider, so **a Gmail sync will restore an archived message** — pushing them is tracked separately.

  **Conversation menu** gains "Create Project" (the `CreateProjectFromMessage` operation previously had no UI) and sender enrichment. The latter arrives through a new `InboxCapabilities.SenderAction` capability rather than a direct import, because plugin-crm already depends on plugin-inbox; `createInvocations` returns a list so a contributor can express a composite (research, then image) without fusing it into one operation.

  **Pipeline actions are hidden until a connection is configured** — previously Enrich was offered on a mailbox with nothing to enrich.

  **`RecordArticle` gains a toolbar** sourced from the subject's own app-graph node, so any plugin can contribute type-specific actions to it; plugin-crm contributes Enrich for `Person` and `Organization`. `Card.Action` gains a `leading` slot so a row standing for a person can show their avatar instead of a generic glyph.

  **Removed:** `InboxOperation.ProcessMailbox` and its routine template. Its cursor helpers were shared with `ClassifyMailbox` and survive at `operations/cursor.ts` with a now-required consumer id; `ResetProcessCursor` becomes the generic `ResetFeedCursor`, also with a required `cursorId`. `CrmOperation.ProcessMailbox` is unrelated and unaffected.

- 12b6618: Mailbox scan cascade. `ScanMailbox` spawns the mailbox pipelines in cost order —
  deterministic extraction (contacts, subscriptions), then cheap LLM classification, then per-message
  summarization — surfaced as a Scan action on the mailbox and a `scanMailbox` routine template.
  Summaries are stored as immutable annotations on a second mailbox feed (`Mailbox.annotations`,
  `ContentBlock` disposition `summary`) and merged into the message article on read. Tracking projects
  now take a `scope` and a `pipeline`, choosing which operation their routine binds.
- fa36e26: Add a cursored, resettable ProcessMailbox pipeline with a start/stop mailbox toolbar action, sync-style progress, and a routine template; AnalyzeMailbox now reports progress, no longer adopts other consumers' feed cursors, and fact extraction processes unordered feeds oldest-first so the cursor cannot skip unprocessed messages.
- 098a0bb: Mailbox feed processors are now contributed, not enumerated. `ScanMailbox` used to hold every pass it
  could run in a literal `Record<MailboxTier, () => Stage[]>`, so nothing outside plugin-inbox could add
  one — which is why plugin-brain injects `Analyze` as a toolbar menu item rather than a pipeline stage.
  Plugins now contribute an `InboxCapabilities.MailboxProcessor`, and the cascade resolves them into a
  run order from the `after` edges each declares. plugin-inbox contributes its own five through the same
  seam, so there is no privileged built-in path to drift from the contributed one.

  `stages[].operation` in the output is now `stages[].processor` and carries the processor id rather
  than the operation DXN — the id is also the topology key and the cursor tag. `MAILBOX_TIER_ORDER` is
  removed: a tier selects which processors run, the edges decide the order.

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

- 881f900: The Google provider moves out of `@dxos/plugin-inbox` into its own headless plugin, `@dxos/plugin-google`, which contributes the Gmail, Google Calendar and Google Contacts connectors along with every sync, send, materialize and discovery operation. Like `@dxos/plugin-jmap`, it is registered in Composer and enabled by default alongside the Inbox, so connecting a Google account is unchanged for users. Both providers declare `dependsOn: ['org.dxos.plugin.inbox']` in their plugin profile.

  With that, `plugin-inbox` no longer has an `apis/` or `services/` directory: every provider wrapper and its Effect service now lives with the provider that owns it. `Mailbox`, `Calendar`, `InboxOperation` and the inbox skills are unaffected — provider operation definitions still live in `InboxOperation`.

  Two changes visible to test code: `seedMailboxBinding` from `@dxos/plugin-inbox/testing/sync` now requires `source` and `connectorId` (they previously defaulted to Gmail's, which a provider-neutral harness cannot name), and the Gmail fixtures (`generateGmailDataset`, `GmailDataset`) move to `@dxos/plugin-google/testing`. `@dxos/plugin-inbox/testing` also drops its `node` export condition, which existed only to serve those fixtures.

- 881f900: The JMAP mail provider moves out of `@dxos/plugin-inbox` into its own headless plugin, `@dxos/plugin-jmap`, which contributes the JMAP connector, its credential form, and the sync/send/materialize operations. It is registered in Composer and enabled by default alongside the Inbox, so connecting a JMAP account is unchanged for users.

  `@dxos/plugin-inbox` gains two export subpaths in the process: `./sync`, the provider-agnostic mail-sync harness and its `MailSyncProvider` contract (previously an internal module under `operations/`), and `./testing/sync`, the shared sync-test harness a provider plugin's own tests build on. Provider operation _definitions_ stay in `InboxOperation`, so no consumer of `Mailbox`, `InboxOperation`, or the inbox skills is affected.

  Consumers of `@dxos/plugin-inbox/testing` that used the JMAP fixtures (`generateJmapDataset`, `JmapDataset`, `Jmap`) should import them from `@dxos/plugin-jmap/testing` instead.

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

### Patch Changes

- 098a0bb: The analysis cursor is now tagged for its consumer like every other feed cursor. It used to be
  identified by carrying no foreign key at all — "the untagged one on this feed is mine" — which is the
  absence of an identity rather than an identity, so any later consumer that failed to tag its own
  cursor was silently adopted and analysis resumed from that consumer's watermark, skipping everything
  below it with no error. A legacy untagged cursor is adopted in place rather than replaced, so
  existing mailboxes keep their position instead of re-analyzing the whole feed at one model call per
  message.
- 9c86066: `Row.Person` now always renders the actor's avatar, with the contact affordance built in: hovering an avatar whose contact resolves opens that Person's card, and an unresolved one offers to create the contact. The variant is chosen by the presence of `db` (or the new list-friendly `getContact` lookup) rather than an `avatar` flag, which is removed; `ContactAvatar` is exported for surfaces that lay out their own rows, and `size` selects between the dense (6) and message-header (9) avatar.

  Also: a virtual list whose first page fits its viewport now extends instead of waiting for a scroll it can never receive; the shared contact extractor refuses machine senders (`no-reply@`, `mailer-daemon@`, qualified role addresses like `invoice+statements+acct_…@stripe.com`); and mailbox summarization summarizes whole conversations rather than individual messages.

- 5bb340f: Parse `From` headers that omit the display name or the angle brackets. A relay emitting a bare `user@example.com` previously synced the message with no sender at all, which also skipped contact resolution and no-reply detection.
- 4804da0: `Aggregate.group` now accepts a `coalesce` chain (`Aggregate.group({ coalesce: ['threadId', 'id'] })`), keying each group on the first property holding a scalar value, with `id` resolving to the object's entity id. Breaking: the `group` aggregate's query-AST field is now `properties` (a fallback chain) instead of `property`.
- 256f286: Projects gain a lifecycle `status` field (`active | paused | blocked | ended`), surfaced through the MCP-projected verbs, and plugin-projects ships a project-management skill for external agents — including the `/codeProject setup` flow that binds a repo to an existing space. The skill's key segment is `codeProject` because the segment doubles as the projected MCP prompt name and plain `project` belongs to assistant-toolkit's own skill.

  `toEffectSchema` recognizes ECHO's reference sentinel before the generic `type: 'object'` branch, so a reference node widened with structural keywords (as a wire boundary may do for schema-unaware consumers) decodes as a reference instead of a plain struct. Serialization is unchanged — persisted schemas stay byte-identical to previous releases.

  Worker (`workerd`) bundles no longer pull in React. Wrangler resolves `workerd, worker, browser` and never `node`, so a `#capabilities` map offering only `node` and `default` handed workers the browser barrel and its React surfaces. Every plugin with a headless entry now resolves a server-safe barrel under a `workerd` condition, and the `check-module-structure` guards trace with `workerd,worker` — the conditions a worker actually resolves — so a reintroduced leak fails the check instead of passing against a build that is never shipped.

- eb95cd7: BREAKING: `FeedAnnotation` now carries `{ property: string }` naming the property that holds the feed reference, instead of a bare `true`. A bare `true` said a type owned a feed but not which property held it, so every consumer hardcoded `.feed`. Use the new `getFeedRef(obj)` and `isFeedOwnerSchema(schema)` helpers instead of reading the property directly.
- 098a0bb: Related-message rows show the derived summary, falling back to the provider snippet and only then to
  the subject. Once the section collapses a thread to one row the subject carries no information — every
  row in a thread repeats the same `Re: …`. Summaries are read from the mailbox's annotation feed, so
  rows improve as the summarization pipeline runs; snippet is set by both the Gmail and JMAP mappers, so
  the middle rung is populated for synced mail immediately.
- 098a0bb: Rename the overloaded `Enrich` actions. `Enrich` labelled four unrelated things, two of them on
  adjacent toolbars: the CRM record and sender actions are now `Research` (matching the
  `ResearchPerson` / `ResearchOrganization` operations they invoke, and signalling that the run goes
  out to the web), `Enrich images` is now `Find images`, and the dead `view-mode-enriched` translation
  key — unreachable, since view-mode labels derive from `VIEW_MODES` — is removed. Operation ids for
  `EnrichImages` and `ResearchPerson` / `ResearchOrganization` are unchanged.
- 098a0bb: A failed scan processor now blocks only its descendants in the topology; independent branches still
  run. Previously the cascade aborted by run POSITION, so a failing processor stranded everything after
  it in the list — `subscriptions` declares no edge to `classify`, yet a classification failure skipped
  it purely for sitting later. Each blocked processor now names the upstream that invalidated it.
- 098a0bb: A service no plugin contributed now skips its scan tier instead of failing the cascade. The tiers'
  declared services are resolved eagerly at spawn time, so an uninstalled plugin surfaced as a
  `ServiceNotAvailableError` before the handler ran — and only the `AiService` flavour was recognised as
  a precondition. Anything else was classified as a genuine failure, which (with `continueOnError` off,
  since a later tier consumes the earlier one) aborted the whole run and stranded the deterministic work
  behind it. In practice that meant running the `analyze` tier without plugin-brain turned a healthy
  mailbox's scan red. The gate is now uniform over the tag and names it in the reason.
- Updated dependencies [0280a6a]
- Updated dependencies [86d1482]
- Updated dependencies [4025ffe]
- Updated dependencies [2cad6c0]
- Updated dependencies [af1c007]
- Updated dependencies [106d38a]
- Updated dependencies [8363f12]
- Updated dependencies [9477170]
- Updated dependencies [d2be597]
- Updated dependencies [e2eecf2]
- Updated dependencies [2800d03]
- Updated dependencies [96f94c2]
- Updated dependencies [592b00e]
- Updated dependencies [6d52561]
- Updated dependencies [4a0b78b]
- Updated dependencies [34a8433]
- Updated dependencies [0fe00c5]
- Updated dependencies [b8762ef]
- Updated dependencies [f3f55a8]
- Updated dependencies [b2d5bb2]
- Updated dependencies [3aa3d63]
- Updated dependencies [85ad256]
- Updated dependencies [2d4107f]
- Updated dependencies [c56ba34]
- Updated dependencies [069e8ed]
- Updated dependencies [7becabf]
- Updated dependencies [73daef4]
- Updated dependencies [75971ad]
- Updated dependencies [3958355]
- Updated dependencies [fee7666]
- Updated dependencies [d194929]
- Updated dependencies [557e243]
- Updated dependencies [49aee6c]
- Updated dependencies [ea11703]
- Updated dependencies [5305365]
- Updated dependencies [881f900]
- Updated dependencies [881f900]
- Updated dependencies [881f900]
- Updated dependencies [881f900]
- Updated dependencies [881f900]
- Updated dependencies [9c86066]
- Updated dependencies [a09e18e]
- Updated dependencies [a3d45c4]
- Updated dependencies [881f900]
- Updated dependencies [6d28380]
- Updated dependencies [da37a13]
- Updated dependencies [0a01ff7]
- Updated dependencies [1c995c4]
- Updated dependencies [a69d861]
- Updated dependencies [ba08e65]
- Updated dependencies [dbff1e4]
- Updated dependencies [3ee20ca]
- Updated dependencies [9817b6f]
- Updated dependencies [5fcd238]
- Updated dependencies [5e8878c]
- Updated dependencies [e094f74]
- Updated dependencies [3e02201]
- Updated dependencies [4800a6f]
- Updated dependencies [1b62726]
- Updated dependencies [a3b6ef0]
- Updated dependencies [b02fe16]
- Updated dependencies [c439ba0]
- Updated dependencies [6af130f]
- Updated dependencies [c8b7158]
- Updated dependencies [2c442f9]
- Updated dependencies [2922d36]
- Updated dependencies [d62a947]
- Updated dependencies [7d000b9]
- Updated dependencies [cafa240]
- Updated dependencies [813069c]
- Updated dependencies [4c107a2]
- Updated dependencies [b9d72bb]
- Updated dependencies [9477170]
- Updated dependencies [84568a0]
- Updated dependencies [0ef896f]
- Updated dependencies [48fd9fe]
- Updated dependencies [3e9a10f]
- Updated dependencies [8ea2bf9]
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
- Updated dependencies [9477170]
- Updated dependencies [cc45381]
- Updated dependencies [bcfe4c5]
- Updated dependencies [6328de3]
- Updated dependencies [12b6618]
- Updated dependencies [fa36e26]
- Updated dependencies [df0ab57]
- Updated dependencies [41e2750]
- Updated dependencies [ebb8f4a]
- Updated dependencies [4f760ce]
- Updated dependencies [557e243]
- Updated dependencies [ca34a80]
- Updated dependencies [29543ca]
- Updated dependencies [e26af7e]
- Updated dependencies [ab79741]
- Updated dependencies [c0e5651]
- Updated dependencies [3214dcf]
- Updated dependencies [8cec4c2]
- Updated dependencies [40ecd44]
- Updated dependencies [24fcadc]
- Updated dependencies [1160094]
- Updated dependencies [77a2d34]
- Updated dependencies [5ae704b]
- Updated dependencies [4804da0]
- Updated dependencies [61fe676]
- Updated dependencies [d4b4919]
- Updated dependencies [63e500b]
- Updated dependencies [7c426d4]
- Updated dependencies [cd4da46]
- Updated dependencies [19f19a2]
- Updated dependencies [dfce73e]
- Updated dependencies [1b6e258]
- Updated dependencies [93c7523]
- Updated dependencies [4a71ef2]
- Updated dependencies [987f7e1]
- Updated dependencies [e7fc023]
- Updated dependencies [1ab4bb8]
- Updated dependencies [a78a66d]
- Updated dependencies [32468c3]
- Updated dependencies [0a3e9dd]
- Updated dependencies [256f286]
- Updated dependencies [306f50d]
- Updated dependencies [6c881a2]
- Updated dependencies [092f3be]
- Updated dependencies [74f9b30]
- Updated dependencies [cc9b81f]
- Updated dependencies [5b504b4]
- Updated dependencies [eb95cd7]
- Updated dependencies [a53cabb]
- Updated dependencies [d7b0a3b]
- Updated dependencies [20e86ba]
- Updated dependencies [1482a3f]
- Updated dependencies [af1ff99]
- Updated dependencies [2513a52]
- Updated dependencies [1d6f730]
- Updated dependencies [b125655]
- Updated dependencies [f962a7d]
- Updated dependencies [0280a6a]
- Updated dependencies [9e91762]
- Updated dependencies [4f55909]
- Updated dependencies [f4c2702]
- Updated dependencies [dea5df9]
- Updated dependencies [318bbad]
- Updated dependencies [fc83abd]
- Updated dependencies [efa7836]
- Updated dependencies [678ba58]
- Updated dependencies [8904184]
- Updated dependencies [e680b16]
- Updated dependencies [a805212]
- Updated dependencies [77d0026]
- Updated dependencies [e288833]
- Updated dependencies [ea11703]
- Updated dependencies [886453b]
- Updated dependencies [0280a6a]
- Updated dependencies [18597fc]
- Updated dependencies [63629c5]
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
- Updated dependencies [f9816c0]
- Updated dependencies [578b543]
- Updated dependencies [78523d2]
- Updated dependencies [06cbe76]
- Updated dependencies [40b50c2]
- Updated dependencies [4ae2005]
- Updated dependencies [85bdad2]
- Updated dependencies [77d0026]
- Updated dependencies [4a10672]
- Updated dependencies [ee180f6]
- Updated dependencies [79d5ecf]
- Updated dependencies [cc11297]
- Updated dependencies [ff37699]
  - @dxos/app-framework@0.12.0
  - @dxos/app-toolkit@0.12.0
  - @dxos/client@0.12.0
  - @dxos/plugin-markdown@0.12.0
  - @dxos/assistant@0.12.0
  - @dxos/echo@0.12.0
  - @dxos/ai@0.12.0
  - @dxos/react-ui@0.12.0
  - @dxos/link@0.12.0
  - @dxos/pipeline-email@0.12.0
  - @dxos/compute@0.12.0
  - @dxos/types@0.12.0
  - @dxos/plugin-client@0.12.0
  - @dxos/plugin-connector@0.12.0
  - @dxos/react-ui-card@0.12.0
  - @dxos/react-ui-mosaic@0.12.0
  - @dxos/extractor-lib@0.12.0
  - @dxos/plugin-space@0.12.0
  - @dxos/react-ui-form@0.12.0
  - @dxos/echo-client@0.12.0
  - @dxos/ui-editor@0.12.0
  - @dxos/graph@0.12.0
  - @dxos/app-graph@0.12.0
  - @dxos/react-ui-menu@0.12.0
  - @dxos/react-ui-list@0.12.0
  - @dxos/plugin-settings@0.12.0
  - @dxos/plugin-observability@0.12.0
  - @dxos/ui-theme@0.12.0
  - @dxos/react-ui-editor@0.12.0
  - @dxos/ui-types@0.12.0
  - @dxos/pipeline@0.12.0
  - @dxos/plugin-routine@0.12.0
  - @dxos/react-ui-components@0.12.0
  - @dxos/schema@0.12.0
  - @dxos/util@0.12.0
  - @dxos/react-hooks@0.12.0
  - @dxos/plugin-graph@0.12.0
  - @dxos/extractor@0.12.0
  - @dxos/echo-doc@0.12.0
  - @dxos/echo-query@0.12.0
  - @dxos/echo-react@0.12.0
  - @dxos/react-ui-search@0.12.0
  - @dxos/react-ui-table@0.12.0
  - @dxos/react-ui-attention@0.12.0
  - @dxos/react-ui-calendar@0.12.0
  - @dxos/async@0.12.0
  - @dxos/effect@0.12.0
  - @dxos/log@0.12.0
  - @dxos/errors@0.12.0
  - @dxos/invariant@0.12.0
  - @dxos/keys@0.12.0
  - @dxos/markdown@0.12.0

## 0.11.1

### Patch Changes

- 5fde190: Sync Gmail and JMAP mailboxes automatically as soon as they are connected, and run their sync schedule on EDGE so mail keeps arriving while the app is closed.
  - @dxos/ai@0.11.1
  - @dxos/app-framework@0.11.1
  - @dxos/app-graph@0.11.1
  - @dxos/app-toolkit@0.11.1
  - @dxos/assistant@0.11.1
  - @dxos/async@0.11.1
  - @dxos/client@0.11.1
  - @dxos/compute@0.11.1
  - @dxos/compute-runtime@0.11.1
  - @dxos/context@0.11.1
  - @dxos/debug@0.11.1
  - @dxos/echo@0.11.1
  - @dxos/echo-client@0.11.1
  - @dxos/echo-doc@0.11.1
  - @dxos/echo-query@0.11.1
  - @dxos/echo-react@0.11.1
  - @dxos/effect@0.11.1
  - @dxos/errors@0.11.1
  - @dxos/extractor@0.11.1
  - @dxos/extractor-lib@0.11.1
  - @dxos/invariant@0.11.1
  - @dxos/keys@0.11.1
  - @dxos/link@0.11.1
  - @dxos/lit-ui@0.11.1
  - @dxos/log@0.11.1
  - @dxos/markdown@0.11.1
  - @dxos/pipeline@0.11.1
  - @dxos/pipeline-email@0.11.1
  - @dxos/pipeline-rdf@0.11.1
  - @dxos/protocols@0.11.1
  - @dxos/random@0.11.1
  - @dxos/react-client@0.11.1
  - @dxos/react-hooks@0.11.1
  - @dxos/react-ui-attention@0.11.1
  - @dxos/react-ui-calendar@0.11.1
  - @dxos/react-ui-card@0.11.1
  - @dxos/react-ui-components@0.11.1
  - @dxos/react-ui-editor@0.11.1
  - @dxos/react-ui-form@0.11.1
  - @dxos/react-ui-list@0.11.1
  - @dxos/react-ui-menu@0.11.1
  - @dxos/react-ui-mosaic@0.11.1
  - @dxos/react-ui-rdf@0.11.1
  - @dxos/react-ui-search@0.11.1
  - @dxos/react-ui-table@0.11.1
  - @dxos/schema@0.11.1
  - @dxos/types@0.11.1
  - @dxos/ui-editor@0.11.1
  - @dxos/util@0.11.1
  - @dxos/plugin-attention@0.11.1
  - @dxos/plugin-client@0.11.1
  - @dxos/plugin-connector@0.11.1
  - @dxos/plugin-graph@0.11.1
  - @dxos/plugin-markdown@0.11.1
  - @dxos/plugin-observability@0.11.1
  - @dxos/plugin-preview@0.11.1
  - @dxos/plugin-routine@0.11.1
  - @dxos/plugin-settings@0.11.1
  - @dxos/plugin-space@0.11.1

## 0.11.0

### Minor Changes

- 48d168e: Gmail and JMAP sync are now always bidirectional and durably resumable: the sync cursor tracks a `max`/`min` watermark pair (replacing `value`), each run syncs new mail forward and continues backfilling backward in the same pass, and a per-run message cap requests a durable re-run via `Operation.runAgain()` instead of looping in-process. The sync operations now take only the binding — the `direction`/`after`/`before` inputs are removed. Breaking: the `Cursor` schema field `value` becomes the `max`/`min` pair, `Cursor.resolveWindow` is replaced by `Cursor.resolveHorizon`/`Cursor.resolveWindows`, `Cursor.dedupStage` drops its `direction` option, and `Cursor.advance`/`Cursor.parseKey`/`Cursor.formatKey` operate on `max` instead of `value`.
- ba7aabf: Add `Html`, a sandboxed renderer for untrusted HTML: sanitized content in a Shadow DOM host, so the document's CSS cannot reach the app while it still flows in the app layout, with remote images blocked by default. Content-specific behaviour is supplied as an `HtmlDialect` — a plain value carrying CSS, transforms and a `src` resolver — rather than baked into the component; `emailDialect()` is the first of these. `plugin-inbox`'s `HtmlViewer` is replaced by that pair, moving `cid:` attachment resolution into the plugin (`useCidResolver`) so the shared UI package no longer depends on ECHO.

  Email bodies now honour the sender's `color-scheme` declaration, read from the raw markup before sanitization strips it: a body declaring `light` is left as authored on a light sheet in dark mode, and anything undeclared is recolored to the app theme regardless of layout (the previous table-layout exemption preserved too little to justify leaving marketing mail glaring white in dark mode).

- 2a68c3b: The conversation view (`MessageArticle`) now renders threads as a Mosaic stack: each message is a tile with its own toolbar, so Reply/Reply All/Forward/AI reply/Delete act on that specific message rather than always targeting the newest one. Body view controls (view mode, load remote images) and collapse-all/expand-all move to a single thread toolbar that applies to the whole conversation, and each message can be individually collapsed to a compact summary. The per-message `Message.Toolbar` no longer includes the view-mode switcher or load-images toggle.

  By default only the most recent message is expanded and the rest are collapsed. Replying to a message now records the specific message it answers (`parentMessage`), so the draft renders directly after that message in the thread rather than always at the bottom, and it is smoothly scrolled fully into view.

  `Listbox.Item` rows with an `onClick` (not just selectable ones) are now keyboard-focusable and respond to Enter/Space, matching native `<button>` activation.

- 30ae5eb: Add stable `data-testid`s across the inbox and connector UI (mailbox sync/reply/message actions, message and conversation tiles, connect dropdown) and an optional `testId` param on `AppNode.makeToolbarActionGroup` / `react-ui-menu`'s menu builder, enabling reliable browser-e2e targeting.
- 2543b63: Mail sync is now incremental and provider system state maps onto shared canonical tags.

  Incremental delta-resume: the sync cursor carries an opaque provider delta token (Gmail `historyId`, JMAP `Email/get` state). After the initial window backfill, each run fetches only the delta since the token (Gmail `history.list` — paginated so multi-page deltas are not dropped; JMAP `Email/changes`), applying additions plus label/flag reconciliation to already-committed feed messages via objectless commit units. A stale token falls back to the window scan and recaptures; the token advances only after the run's merged stream fully drains, so a crash re-fetches the delta idempotently.

  Unified system tags: Gmail system labels, JMAP mailbox roles, and the JMAP `$flagged` keyword now resolve to a shared, provider-agnostic tag registry (`org.dxos.tag`: starred / inbox / important / sent / and the Gmail categories) instead of provider-scoped tags — so a Gmail star, a JMAP flag, and a locally-toggled star are the same tag. Read-state, drafts, trash, spam, and archive are intentionally not tagged (archive is derived as "not in inbox"). The starred tag's foreign key moves from `org.dxos.org` to `org.dxos.tag`; existing locally-starred items under the old key are not migrated.

- 33e1a3d: Bring JMAP mail sync to feature parity with Gmail — live progress monitor with cancellation, stats-panel telemetry, and failure reporting — and drive both providers through one shared, provider-agnostic sync effect (`runMailSync`) that takes its provider as an Effect service, so each handler is the same run with its own provider layer (API + resolver) provided.
- a2447cd: Restructure the mailbox nav tree around an inbox-filtered default view, with All Mail, Sent, and Drafts as sibling views rendered through the same list and message companion; drafts now appear inline on their thread wherever it's already shown. Inbox and Sent resolve by the canonical system tag's identity, matching feed messages by the ids resolved from the mailbox's tag index rather than a query-level tag filter (which can't see tags on immutable feed messages) or label text, so both actually populate and stay correct across providers/locales. The sync and analyze-topics actions now appear on every one of a mailbox's views (previously only the primary node).

  Drafts is now a canonical system-tag view like Inbox/Sent, not a separate data path: a draft is tagged when composed and untagged the instant it sends, so the Drafts view is a plain tag-filtered query over the same aggregate/pagination pipeline as every other view, and a mailbox's in-flight drafts drop out of the "attach to thread" list the moment they're sent rather than waiting on the next sync. Every draft-creation path (new compose, inline reply/reply-all/forward, and the AI assistant's draft tool) applies the tag consistently. Composing a brand-new message now navigates to the Drafts view and selects the new draft, so its message companion opens immediately.

- 5e7839e: Mailbox sync progress can now be cancelled from the sync meter: for an edge-executed sync trigger the cancel control stops the current run and its continuation chain, while the trigger's schedule stays enabled and re-syncs on its next tick. `@dxos/compute` now exports the `Cancellation` service the runtimes provide (`Cancellation.Service`) and operations observe (`Cancellation.signal`).

  Breaking:
  - `@dxos/app-toolkit`: `ProgressTraceSinkOptions.terminateProcess` is renamed to `cancelProcess` and takes a `CancelTarget` (pid, space, runtime, trigger) instead of a pid, so a cancel can be routed to the runtime that owns the run.
  - `@dxos/compute-runtime`: `SwarmRemoteTraceMonitorOptions.subscribe` yields `SwarmTraceBroadcast` (`{ payload, tags }`) instead of a bare payload — the envelope tags carry the ref-typed trace meta dropped by the wire codec.

- 923d5be: Auto-create a recurring sync Routine when a mailbox or calendar is bound to a connection (new connection, multi-target selection, or reusing an existing connection); the toolbar "Sync" action force-runs it and disables while a sync is already in progress. Fixes a legacy-DXN compatibility gap in `refToEffectSchema` and a bug where cancelling a Gmail sync left its progress monitor stuck at "running".
- 0a4bbde: One identity rule per type, shared by the extractor's create-vs-merge decision and by a new duplicate scan, plus a Duplicates tab on the database type article for reviewing and merging what has already accumulated.

  Contact extraction is now an allow-list: a sender earns a Person only when we sent or replied to it, or its domain matches a known Organization, and never when the address or message is automated. Mail sync and Google Contacts sync resolve against one index per space rather than a snapshot each, so concurrent syncs no longer both create the same person.

- f0ec728: Promote `Topic` to a first-class domain type. `Topic` moves from `@dxos/pipeline-email` to `@dxos/types` as a Project-style class (inline title/label/icon annotations + `make` factory), keeping a shared `Topic.Props` struct and its `org.dxos.type.topic` DXN. The Topic detail view (`TopicArticle`) moves to `@dxos/plugin-brain` and renders via a regular object/article surface.

  Breaking: `Topic` / `TopicProps` are no longer exported from `@dxos/pipeline-email` — import from `@dxos/types` and use the namespace form (`Topic.Topic`, `Topic.Props`). No compatibility re-export is left behind.

- bb63d91: Clean up inbox operations: remove unused `DeleteEmail`, `DeleteEvent`, `SyncDraftEvents`, `SyncContacts` operations and the dead `tool-ids.ts` file. Deprecate `ExtractContact` and `ExtractMailbox`. Add a defensive double-click guard to toolbar action buttons — they now disable while the handler is in-flight.

### Patch Changes

- 724d468: Fix Mailbox.recordExtraction dropping the first extraction recorded on a fresh mailbox (detached-record write).
- 2fb1993: Open a new mail draft as a plank beside the mailbox view it was composed from, and leave reply/forward drafts inline in their conversation instead of navigating to Drafts.
- 98d79ec: Fix Gmail sync wedging permanently when a message is deleted before it is fetched: the 404 now drops that
  message instead of failing the run and stranding the history token.
- 1872bc0: Hide markdown images with an empty target (`![alt]()`) when image loading is disabled. The match required a non-empty url, so these fell through and rendered as a broken image with their source left visible, alongside the `cid:` and protocol-relative targets already handled.
- d958118: Inbox draft composer rebuilt as a compose-style form, plus the shared UI it needs. `@dxos/react-ui` `Input.TextInput` gains MUI-style `start`/`end` adornments rendered inside the input container; `@dxos/ui-theme` adds a shared `.dx-input` box treatment (surface + hairline border + focus-within shift) now used by Input, `MarkdownField`, `RefEditor`, and the inbox editor. `@dxos/react-ui-form` `RefEditor` email mode renders committed mailboxes as atomic tag widgets (trailing delete affordance, no `@` marker) — a raw address stays plain text until committed with comma/Space/Enter, typing before a tag starts a fresh token, and the single line is centered so text and tags align. `@dxos/ui-editor`'s `defaultThemeSlots` is now `fullWidth` (no longer forces `h-full`). `@dxos/plugin-inbox` `EditMessage` gains To/Cc/Bcc recipient pickers with Person autocomplete, arrow-key field navigation, and a layout fix so Send no longer overlaps the editor.
- 3b4a7c8: The inbox message view selector (HTML / Markdown / Plain) now persists across messages and sessions. The choice is stored alongside the other inbox settings (the `loadRemoteImages` toggle) in the plugin's settings store, so it survives reloads instead of resetting to HTML on every open. Also reorganizes `useArticleKeyboardNavigation` under `AttentionProvider` (no change to the `@dxos/react-ui-attention` public exports).
- 6dd1aa8: Mailbox UX fixes: the Gmail sync progress meter now shows a determinate bar (the retrieval total is known once message ids are enumerated); the Topics and Subscriptions articles use the standard `Panel.Toolbar` menu idiom and render their lists (and topic suggestions) via `react-ui-mosaic` `Stack`; selecting a topic opens `TopicArticle` in the companion; the `Topic` type now has a navtree name; and the one-click unsubscribe POST no longer triggers a CORS console error.
- 9cde1c6: `usePagination`'s `isLoading` now reflects genuine query settlement instead of clearing on the next microtask regardless of delivery, so consumers can reliably distinguish "still loading" from "loaded and empty" even for async, feed-backed queries. The mailbox article uses this to fix a bug where it could briefly flash the wrong empty-state message (e.g. "No connections configured") while a large mailbox's messages were still loading.
- 0afbf15: Fix mailbox paging and the list blanking during sync. `usePagination` now keeps the previously-shown page across a query-identity change instead of resetting to empty + loading, and the virtualizer pagination hook re-arms `getNext` after a page lands and no longer misreads a reordered item as an eviction. The mailbox renders a loading spinner in-flow at the end of the list rather than replacing the whole panel.
- 1a989ed: Graph actions can now declare `disposition` as an array and a `presentation` chrome override per surface, letting one action multi-target the object toolbar and nav-tree context menu with appropriate chrome in each. Mailbox and calendar "Sync" now surface from a single graph action instead of a duplicated toolbar button.
- cb14d6e: Fix auto-created mailbox/calendar sync triggers so their `input` carries only `binding`, matching the sync operation's input schema. The trigger no longer smuggles an extra `mailbox`/`calendar` ref into the operation input; the routine is instead discovered through its `binding` cursor's `spec.target`.
- Updated dependencies [f9ba47a]
- Updated dependencies [4e64123]
- Updated dependencies [c035062]
- Updated dependencies [5585ec8]
- Updated dependencies [aea1e6e]
- Updated dependencies [9da013f]
- Updated dependencies [c3625d3]
- Updated dependencies [48d168e]
- Updated dependencies [e0e1a9f]
- Updated dependencies [31fe0b8]
- Updated dependencies [46ec569]
- Updated dependencies [53fde97]
- Updated dependencies [5b05d75]
- Updated dependencies [b5ecf54]
- Updated dependencies [3f6ac61]
- Updated dependencies [091ebe4]
- Updated dependencies [a77e1a2]
- Updated dependencies [a256a87]
- Updated dependencies [bce1dbc]
- Updated dependencies [a31ef40]
- Updated dependencies [eec72c5]
- Updated dependencies [ed992c2]
- Updated dependencies [e510f3b]
- Updated dependencies [1a9bca1]
- Updated dependencies [68e61ca]
- Updated dependencies [ed992c2]
- Updated dependencies [bf013a1]
- Updated dependencies [a83d98a]
- Updated dependencies [fe63f19]
- Updated dependencies [a19443b]
- Updated dependencies [dd190a0]
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
- Updated dependencies [717edc0]
- Updated dependencies [2e10525]
- Updated dependencies [6a03a30]
- Updated dependencies [77fff35]
- Updated dependencies [2fe5a7a]
- Updated dependencies [7b270f2]
- Updated dependencies [7b270f2]
- Updated dependencies [af5fbf4]
- Updated dependencies [717edc0]
- Updated dependencies [c58ebb7]
- Updated dependencies [d547045]
- Updated dependencies [b602d44]
- Updated dependencies [6439417]
- Updated dependencies [277e365]
- Updated dependencies [ba7aabf]
- Updated dependencies [410a019]
- Updated dependencies [d958118]
- Updated dependencies [2a68c3b]
- Updated dependencies [30ae5eb]
- Updated dependencies [2543b63]
- Updated dependencies [6d2afe0]
- Updated dependencies [e65432c]
- Updated dependencies [f6a01e3]
- Updated dependencies [c9651f1]
- Updated dependencies [9cde1c6]
- Updated dependencies [0d1f866]
- Updated dependencies [5e7839e]
- Updated dependencies [923d5be]
- Updated dependencies [85893fe]
- Updated dependencies [c727a43]
- Updated dependencies [9f7d5ad]
- Updated dependencies [6067460]
- Updated dependencies [717edc0]
- Updated dependencies [12fd785]
- Updated dependencies [6e4ac74]
- Updated dependencies [51aaffe]
- Updated dependencies [801b77f]
- Updated dependencies [1a989ed]
- Updated dependencies [d547045]
- Updated dependencies [bda1a02]
- Updated dependencies [0a4bbde]
- Updated dependencies [59a65a8]
- Updated dependencies [832d150]
- Updated dependencies [aea1e6e]
- Updated dependencies [f10b1ce]
- Updated dependencies [f7d7735]
- Updated dependencies [cec59a4]
- Updated dependencies [717edc0]
- Updated dependencies [cd3ed11]
- Updated dependencies [5f08a6a]
- Updated dependencies [114fb98]
- Updated dependencies [37874ce]
- Updated dependencies [b591791]
- Updated dependencies [848ba1b]
- Updated dependencies [f15c632]
- Updated dependencies [3761762]
- Updated dependencies [c9da903]
- Updated dependencies [a83d98a]
- Updated dependencies [bf055c8]
- Updated dependencies [55bb048]
- Updated dependencies [bdf9f68]
- Updated dependencies [c727a43]
- Updated dependencies [4bb7e3b]
- Updated dependencies [179afc6]
- Updated dependencies [4df6cf3]
- Updated dependencies [7b270f2]
- Updated dependencies [77fff35]
- Updated dependencies [6e624bd]
- Updated dependencies [686fac1]
- Updated dependencies [ed992c2]
- Updated dependencies [25272e3]
- Updated dependencies [0e3a1a9]
- Updated dependencies [96109be]
- Updated dependencies [37c17cc]
- Updated dependencies [f0ec728]
- Updated dependencies [08a3eea]
- Updated dependencies [bb63d91]
- Updated dependencies [392c700]
- Updated dependencies [20153c0]
- Updated dependencies [ed992c2]
- Updated dependencies [ed992c2]
- Updated dependencies [c58ebb7]
- Updated dependencies [a49131a]
- Updated dependencies [5585ec8]
- Updated dependencies [31fe0b8]
- Updated dependencies [4f24c4e]
- Updated dependencies [ac51564]
- Updated dependencies [499dde4]
- Updated dependencies [a1c89fa]
  - @dxos/echo@0.11.0
  - @dxos/plugin-markdown@0.11.0
  - @dxos/app-graph@0.11.0
  - @dxos/async@0.11.0
  - @dxos/schema@0.11.0
  - @dxos/react-ui-list@0.11.0
  - @dxos/plugin-connector@0.11.0
  - @dxos/plugin-routine@0.11.0
  - @dxos/link@0.11.0
  - @dxos/react-ui@0.11.0
  - @dxos/react-ui-editor@0.11.0
  - @dxos/app-toolkit@0.11.0
  - @dxos/plugin-client@0.11.0
  - @dxos/ui-editor@0.11.0
  - @dxos/client@0.11.0
  - @dxos/react-ui-search@0.11.0
  - @dxos/compute-runtime@0.11.0
  - @dxos/echo-client@0.11.0
  - @dxos/compute@0.11.0
  - @dxos/util@0.11.0
  - @dxos/protocols@0.11.0
  - @dxos/app-framework@0.11.0
  - @dxos/keys@0.11.0
  - @dxos/react-ui-form@0.11.0
  - @dxos/react-ui-components@0.11.0
  - @dxos/react-ui-attention@0.11.0
  - @dxos/types@0.11.0
  - @dxos/ui-theme@0.11.0
  - @dxos/log@0.11.0
  - @dxos/echo-react@0.11.0
  - @dxos/react-ui-mosaic@0.11.0
  - @dxos/plugin-space@0.11.0
  - @dxos/extractor@0.11.0
  - @dxos/react-client@0.11.0
  - @dxos/ai@0.11.0
  - @dxos/react-ui-menu@0.11.0
  - @dxos/assistant@0.11.0
  - @dxos/extractor-lib@0.11.0
  - @dxos/pipeline-email@0.11.0
  - @dxos/pipeline-rdf@0.11.0
  - @dxos/echo-doc@0.11.0
  - @dxos/echo-query@0.11.0
  - @dxos/plugin-preview@0.11.0
  - @dxos/react-ui-card@0.11.0
  - @dxos/react-ui-table@0.11.0
  - @dxos/plugin-graph@0.11.0
  - @dxos/plugin-settings@0.11.0
  - @dxos/react-hooks@0.11.0
  - @dxos/react-ui-calendar@0.11.0
  - @dxos/plugin-attention@0.11.0
  - @dxos/react-ui-rdf@0.11.0
  - @dxos/plugin-observability@0.11.0
  - @dxos/lit-ui@0.11.0
  - @dxos/context@0.11.0
  - @dxos/effect@0.11.0
  - @dxos/random@0.11.0
  - @dxos/pipeline@0.11.0
  - @dxos/debug@0.11.0
  - @dxos/errors@0.11.0
  - @dxos/invariant@0.11.0
  - @dxos/markdown@0.11.0
