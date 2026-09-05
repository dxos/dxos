# @dxos/echo

## 0.12.0

### Minor Changes

- e2eecf2: Add a `legacyId` option to `Annotation.make` for adopting a pre-existing, non-FQN annotation id without renaming it and risking orphaned persisted state.
- 2800d03: New `Annotation.SetParent` marks a `Ref` field (or an array-of-`Ref` field) as owning its targets: writing a ref into the field, or creating the holder with one, now sets the target's ECHO parent automatically, so the child cascade-deletes and deep-clones with its holder. Nested struct fields and members of a discriminated union field are covered too.

  Types across the repo now declare ownership on the field instead of calling `Obj.setParent` next to every write — `Instructions.text`, `Outline.content`, `Project.{instructions,outline,taskSet,routines}`, `Chat.feed`, `Agent.instructions`, `File.data`, `Channel.backend.config`, `Document.content`, `Mailbox`/`Calendar`/`Search`/`Subscription` feeds and tag indexes, `Routine.{spec.instructions,triggers}`, `Scene.objects`, `Terra.objects`, and `Artifact.variants`. Removing a ref still does not clear the target's parent; call `Obj.setParent(child, undefined)` for that.

- 0fe00c5: Move the `Chat` and `Agent` types to `@dxos/assistant` (`@dxos/assistant/Chat`, `@dxos/assistant/Agent`) and bind the agent process to its `Chat` rather than to a message feed: `AgentService.getSession` now takes the chat, reading the feed and steering instructions from it, and `Harness.getChat` resolves the conversation's chat for session-scoped tools.
- 75971ad: Add plugin management to the CLI. `dx plugin add <url>` fetches a manifest and snapshots it and the bundle under `plugins/<id>/`, so the install is self-describing on disk and needs no network afterwards; `add --dev <path>` reads a directory in place, falling back to its `dx.config.ts` when there is no built manifest, and may override a builtin of the same id. Installing asks for confirmation before any third-party code is evaluated — the plugin runs with the CLI's identity and `dx mcp serve` exposes its operations to agents — and non-interactive callers must pass `--yes`. Both enable by default (`--no-enable` stops at install) and print the resolved plugin id; `remove` deletes a snapshot or forgets a linked directory. Installed plugins register from metadata cached at install time, so a plugin's code is imported only once something enables it, and one that fails to import is reported by `dx plugin list` instead of failing every command. `dx plugin list` now reports `installed`, `enabled`, `core` and the plugin's source as separate fields rather than one collapsed status, with `--enabled` to filter; `enable`/`disable` are idempotent and fail with actionable messages. Hosts can supply their own core plugin set through `PluginManager`'s new `core` option instead of inheriting every `system`-tagged plugin, which is how telemetry, connectors and routines became disableable in the CLI; its demo plugins are no longer enabled by default. A profile whose enabled list is empty is no longer re-seeded with the defaults. A plugin installed from a URL has its `@dxos/*` imports served from the host's own modules, so it shares the CLI's instance of ECHO's schema registry and the capability system rather than loading its own copy; the shared-package list is exported as `@dxos/app-framework/SharedPackages`.
- ea11703: Expose plugin and operation introspection on `globalThis.composer`: `plugins()` lists registered plugins with core/enabled/active state, `operations(pluginId?)` enumerates operations without loading their handlers, and `invoke(key, input)` runs one. Also types the `composer` namespace, replacing the untyped global.
- a69d861: Removed `Ref.byAnnotation` and the `ReferenceConstraint` annotation. The API was never announced and had no call sites: annotations do not participate in the type system, so it produced the same TypeScript type as `Ref.Ref(Obj.Unknown)`, and its check is synchronous, so it could only inspect a target already resident — an unresolved reference passed regardless. Use `Ref.Ref(Obj.Unknown)` and check the target in the handler after loading it.
- 5fcd238: In-memory ECHO objects and relations now implement Effect's `Hash` and `Equal` traits, keyed by entity `id`. `Hash.hash(obj)` is the hash of the object's `id` — cheap, and stable across mutation — instead of a structural digest of the object's contents, so an entity used as a hash-map key (notably `Atom.family`, behind `Obj.atom`) is keyed by identity as documented.

  This changes `Equal.equals` for in-memory entities: two entities are equal if and only if they share an `id`. Two structurally identical objects with different ids no longer compare equal. Nested records are not entities and fall back to reference identity — including one whose schema gives it an application-level `id` field — so structurally identical sub-records of different objects no longer compare equal either. Database-backed objects are unaffected; they are already marked for reference equality.

  Since an entity has exactly one live proxy, id and reference identity coincide in normal use; the traits differ from reference identity only if that invariant is violated, in which case both proxies now resolve to a single hash-map entry.

- 5e8878c: Feed objects are now released when nothing holds them, and `Database.stats()` reports what is resident. `FeedHandle` kept every object it had ever hydrated in a strong identity map, so reading a large feed made it resident for the life of the handle even after the caller dropped every reference; the map is now keyed weakly, and the last subscription snapshot is released when the final subscriber unsubscribes. Objects with unflushed local changes are still held strongly — collecting one would lose the write — so residency tracks the working set and pending writes rather than read history. Entity identity is unchanged while a caller holds an object; an object dropped and re-read is a fresh instance, as it already was for one never read. Alongside this, `stats()` gains a `loaded` field splitting in-memory residency by realm: `loaded.client` (repo-proxy document handles, entity-manager object cores, cached feed handles and their resident feed objects, runtime registry entries) and `loaded.host` (cached automerge handles for the space and host-wide, plus active reactive queries), so a footprint can be attributed to a cache rather than guessed at. Breaking for anyone constructing a `DatabaseStats` value directly — `loaded` is required.
- e094f74: In-memory entity matching now evaluates `Filter.text`: every whitespace-separated term must appear (case-insensitive) in the entity's serialized string values, including meta keys. This reaches registry queries, `Filter.toPredicate`, and registry entities inside scoped database queries; the index-backed document paths are unchanged, and vector search remains index-only.
- a3b6ef0: Migrate the entire monorepo from Effect 3 to Effect 4 (`effect@4.0.0-rc.108`). **This is a breaking change**, carried as a minor because the fixed publish group is pre-1.0.

  Every `@dxos` package now builds against the consolidated `effect` package — `@effect/platform`, `@effect/rpc`, `@effect/cli`, `@effect/sql-*`, `@effect/ai` and `@effect/printer` usages moved to their `effect/unstable/*` counterparts (or were vendored where v4 ships no counterpart). Consumers embedding `@dxos` packages must be on the Effect 4 line: v3 and v4 cannot coexist in one bundle.

  Consumer-visible API consequences include: schemas are values rather than extensible classes (statics such as `SpaceId.random` are merged onto the schema value), `Schema`-derived types follow v4 shapes (`Codec`, checks instead of refinement nodes, string annotation keys), and `Either`-based results became `Result`.

  The AI tool surface changed with it. An `Operation` now projects to a **dynamic** tool carrying the JSON Schema shown to the model, because v4 describes an Effect-schema tool through the provider's structured-output codec while validating the model's arguments against the untransformed schema — a record was advertised as an array of `[key, value]` pairs but validated as an object, and an optional key was advertised nullable-and-required but validated as absent-or-`T`, so a compliant model was always rejected. Tool arguments are decoded at the execution boundary instead, which is also where a ref supplied as a URI string becomes a `Ref`. Alongside it, an open record (`Schema.Record(String, Any)`) now serializes with an explicit `additionalProperties: true`: v4 omits the keyword when the value type is unconstrained, which made a persisted schema round-trip back as a closed struct that accepted no keys.

- b02fe16: Rebuilt `@dxos/graph` on Effect's `Graph` module and split the generic expansion engine out of the app graph builder.

  `GraphModel` is now a long-lived Effect `MutableGraph` with granular per-node and per-edge atom views, `batch()` for single-notification mutation groups, incremental adjacency, `release(ids)` for unloading a subgraph outright (distinct from tombstoning `removeNode`), and opt-in `retainAtoms` that keeps each node's atom mounted for the life of the node. `ReadonlyGraphModel` and `ReactiveGraphModel` merge into `AbstractGraphModel`; constructors take an options bag.

  `@dxos/graph/GraphBuilder` owns the extension registry, connector subscriptions, id qualification, ordering and dirty-flush over a `Store` port, with `ModelGraphBuilder` as the default specialization; `@dxos/app-graph`'s `AppGraphBuilder` specializes the same engine with app nodes, actions and URL bindings (`BuilderExtension.url` is now the generic `meta`). Node-id path helpers move to `@dxos/graph/GraphNode`. The app-graph namespaces are renamed to `AppGraph`/`AppGraphBuilder`/`AppGraphNode` and published as subpaths under those names; the old `NodeMatcher` splits, with the generic combinators in `@dxos/graph/GraphNodeMatcher` and the ECHO-aware ones in `@dxos/app-toolkit/AppNodeMatcher`. Writes read the model directly instead of atoms (a mid-flush atom read returns pre-flush state), flushes coalesce through `GraphModel.batch` rather than `Atom.batch` (whose deferred rebuild strands invalidations raised after its rebuild pass), and expansion, updates and removal are measured faster than before the rebuild across the board.

- 6af130f: Feed queries can now resume from a cursor: `Filter.feedCursor({ begin, end })` selects the items
  inside a cursor range, and the bounds are pushed into the index scan, so a reader pays for what is
  new rather than for the whole feed. Combine it with `limit()` for a bounded page. The position a feed
  item carries is exposed as the typed `Feed.Cursor`, read with `Feed.getCursor`, starting at the
  `Feed.START` sentinel, and stored on a reader with `Feed.CursorAnnotation`. The trigger dispatcher
  uses all of it, and its feed and subscription triggers are now woken by their data instead of being
  re-scanned in full on every poll tick — only timer triggers still need the wall clock.
- 2922d36: Feed sync now detects that the server was replaced or its storage wiped, and re-syncs the affected
  namespace from scratch instead of stalling on positions that no longer exist.

  A position authority reports its store token on query and append responses, clients remember it in
  `sync_state` alongside their pull progress, and every query request echoes it back as
  `expectedServerToken` — a server that does not recognise the token ignores `position` and serves the
  namespace from the start, so recovery costs no extra round-trip. On a mismatch the client drops the
  global position from every block of that space/namespace, restarts progress under the new token, and
  re-pushes; blocks are de-duplicated by `(actorId, sequence)`, so nothing is lost or duplicated.

  Pull progress written before this release carries no token, and its server may already have been
  replaced, so the first token such a client observes triggers the same reset rather than being
  adopted — one extra pull per space/namespace, once, in exchange for not silently skipping every
  block below the stale position. Progress with nothing pulled yet just records the token.

  All protocol fields are optional: older clients keep working against a new server (their `position`
  is honoured verbatim), and a new client against an older server behaves exactly as before.

- 7d000b9: Added `Filter.hasParent(boolean)` for selecting objects by parent presence (indexed, reactive to `Obj.setParent`). Breaking: the `Chat.CompanionTo` relation is removed — companion and agent chats are now linked to their subject by the ECHO parent edge (`Obj.setParent`), and the standalone-chats query selects unparented chats directly.

  Companion chats are linked via `Chat.CompanionChatAnnotation` (refs stored on the subject object) plus the parent edge — `Chat.linkCompanion`; `Obj.setParent` now warns when the parent holds no ref to the child (to become an invariant). The `Err` module is renamed to `Error` (`@dxos/echo/Error`).

- 4c107a2: Support combining a full-text search filter with type filters via `Filter.and` — the query planner pushes the type scope down into the FTS index instead of rejecting the query as too complex. The search plugin now scopes full-text results to user-visible types (the same set the nav tree's Database section lists, plus collections), so search no longer surfaces internal objects such as views, stored schemas, or relation rows, and each result takes its icon from the type's annotation like the nav tree and cards do. Mailbox search stays scoped to the active tag view when combining free text with tag terms. Search is now a system plugin, always enabled rather than opt-in under Labs.
- b9d72bb: Reclaim garbage-collected ECHO documents on every peer, and collect objects that were only transitively deleted. `db.runGarbageCollection()` now also sweeps children of deleted parents and relations with a deleted endpoint — objects that query as deleted without carrying a `deleted` flag of their own — and wipes each document's subduction records, which hold most of its bytes. Documents that leave a space directory are wiped locally as the unlink replicates, so one explicit collection frees disk everywhere. Adds `db.retainObjects(keep)`, which replaces the set of objects the space directory tracks by diffing the retained ids against the directory's own maps — clearing a space is now one root change plus a collection, rather than a query over its contents and a soft delete per object. `SpaceOperation.RemoveAllObjects` is built on it and no longer offers undo. Adds `SpaceOperation.CollectGarbage`.
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

- 8ea2bf9: Render a task set as the sub-task tree it stores, restructurable by dragging a row's handle or with `Alt`+arrow. `TaskList` gains `hierarchical`, `onTaskMove` and controlled `collapsed` state; `Listbox.Item` accepts `onKeyDown`; and the `MoveTask` operation takes an optional `parentTask` so a drop re-parents and repositions in one mutation.
- 0132aab: Arrow keys move between listbox rows again when a row carries its own controls (a task row's status toggle no longer swallows the keypress), a textarea's text is inset like an input's rather than sitting against its border, and a toolbar's density now reaches the controls inside it instead of leaving them at the default size. Markdown edited in place wraps, shows a caret against a dark surface, and takes Tab straight into the text. **Breaking:** `TaskList.Create` is now `TaskList.Edit` — it edits the selected task and creates one only when nothing is selected.
- b600f72: Remove LevelDB and the `@dxos/kv-store` package. Automerge document storage, heads, and the query index are now backed exclusively by SQLite. Profile export/import no longer reads or writes a LevelDB store — legacy `KEY_VALUE` archive entries are skipped on import.
- ca34a80: Added `Migration.defineRename({ from, to })` for migrating references to a renamed named entity (e.g. an operation key). Applying it rewrites the `dxn:` references held in the space's object data, preserving each reference's version suffix; a reference that already reads correctly is not written, so a re-run — or a peer that already replicated the result — is a no-op. Queue and feed contents are not indexed for reverse lookup and are not migrated.

  Migration definitions now carry `Migration.TypeId` and a `kind` discriminant: `Migration.ObjectMigration` (from `Migration.define`) and `Migration.RenameMigration` (from `Migration.defineRename`) both extend the `Migration.Migration` base, narrowed with `Migration.isObjectMigration` / `Migration.isRenameMigration`; `Migration.isMigration` guards an unknown value. `EchoDatabase.runMigrations` accepts both kinds and rejects an unrecognized one before applying any of the batch.

  `Query.select(Filter.key(dxn)).referencedBy()` now finds the objects referencing a named entity. The reverse-reference index covers `dxn:` targets — previously it indexed only `echo:` entity ids — keyed by the unversioned NSID, so one lookup finds every version of a name; existing databases re-index the reverse-reference table once on open to pick up the newly covered references. The planner collapses that construct to a single index lookup, because a named entity is never in the graph and so can never be selected as a traversal anchor. A version-constrained `Filter.key(dxn, { version })` anchor keeps its existing composed meaning, since the index cannot honour a semver range.

- 4804da0: `Aggregate.group` now accepts a `coalesce` chain (`Aggregate.group({ coalesce: ['threadId', 'id'] })`), keying each group on the first property holding a scalar value, with `id` resolving to the object's entity id. Breaking: the `group` aggregate's query-AST field is now `properties` (a fallback chain) instead of `property`.
- 1482a3f: Agents and other processes can now run on EDGE: `AgentService.getSession` takes `location: 'edge'` to spawn a conversation that outlives the client, and `RemoteProcessManager` carries the control surface that drives one (spawn by process key, list, status, input, terminate, cursor-based output/trace reads, RPC). `Process.Monitor.list(filter)` reports processes across local and remote runtimes, so a caller can find its own process without holding a handle.
- 2513a52: Remove the classical Automerge edge replicator. Subduction is now the only edge transport: `EchoEdgeReplicator`, the `runtime.client.edgeFeatures.echoReplicator` config flag, the `EdgeService.AUTOMERGE_REPLICATOR` service id, and the bundle `import`/`export` HTTP surface (`EdgeHttpClient.importBundle`/`exportBundle`) are gone, along with the `EdgeHttpClient.createSpace` endpoint the replicator backed. A client that set `echoReplicator: true` must set `subductionReplicator: true` instead.
- f4c2702: Routines are standalone unless an object owns them. Being triggered by an object is not ownership, so the per-object routines companion is gone: it listed whatever the four-hop `connectedRoutinesQuery` join reached, which is not the same set as "routines that change this object", and it missed changes made any other way. Auditability moves to history and change attribution.

  `Project` (`0.5.0`) regains `routines` — an ordered `Ref(Routine)[]` set alongside the routine's parent edge by the new `Project.addRoutine`, so a project's starter routines cascade-delete with it. Templates in plugin-projects, plugin-crm and plugin-brain now file their starter routine into the array instead of persisting it on its own. Magazine gets the same treatment in follow-up work.

  An object with a parent no longer appears in a top-level type section: `TypeSection.sectionQuery` (the new default) filters `Filter.hasParent(false)`, so an owned object is reached through its owner rather than listed beside it. This generalizes the per-section filter the Chats section already carried, and it applies to a project's routines and chats alike.

  Routine templates (`RoutineCapabilities.Template`) are all global. `appliesTo` is removed; a template that needs an object declares an `inputSchema` which the create panel collects as a form before scaffolding (Analyze Mailbox and CRM ask for a mailbox, Curate Magazine for a magazine), and a template that cannot stand on its own — the connector's Sync, which only its own flow can supply a subject for — sets `hidden` and is reachable by id alone. The `ProjectArticle` toolbar drops its Routines button along with the companion it opened.

  Two fixes fall out of the same area. A type section built without a `sectionUrlKey` used to put a placeholder string in its node's `data`, which made the navtree treat the section header as openable and put up an empty plank; it is now `null`, matching `AppNode.makeSection`. And `Form.Actions` accepts `submitLabel`/`submitIcon`, so a form that is a step rather than the commit can say what it does — the routine create panel's input step now reads "Continue".

  `Filter.type` matches the versioned type exactly and no migration is provided, so projects written at `0.4.0` are not carried forward.

- ea11703: Add an agent debug port to the devtools hook (`dxos.debugPort`) that evaluates snippets delivered by a loopback server, and surface start/stop plus the session id in the Debug plugin's settings. Off by default, activated only by an explicit gesture, and never persisted.
- 18597fc: Add per-space storage metrics and garbage collection to the ECHO `Database`. `db.stats()` reports live/deleted object counts, automerge document count, and feed/feed-block counts; `db.runGarbageCollection()` unlinks soft-deleted objects from the space directory, wipes the automerge documents they leave orphaned, and clears the corresponding index entries. Both are routed through the data service; the local host implements them (the EDGE host is not yet implemented). See the garbage-collection design notes in `@dxos/echo-host`.
- 881f900: Tags now carry a first-class **origin** saying who owns them, and therefore who may change them. It is derived from the foreign key a tag already carries, so no schema change and no migration: `Tag.getOrigin(tag)` returns the origin domain (or `undefined` for a user-created tag), with `Tag.isUserTag` and `Tag.isProviderTag` as predicates, and `Tag.CANONICAL_ORIGIN` naming DXOS's own namespace for provider-agnostic tags such as `starred` and `sent`.

  Three cases: a **user** tag (no key) is fully the user's; a **canonical DXOS** tag (`org.dxos.tag`) is applied and removed locally but its label and hue are fixed, since a provider may be mapping its own vocabulary onto it; a **foreign provider** tag (e.g. `com.google.gmail`) is read-only, because sync owns both the tag and which objects carry it.

  Consequently, tag pickers — including the tags field on property and create forms — now offer **user tags only**. Previously they listed every tag in the space, so a Gmail label could be hand-applied to any object: on a synced object the next delta silently strips it, and on an unsynced one nothing ever corrects it. Pass an explicit `useResults` to a `RefField` to offer a specific origin domain.

  An object's provider tags are also no longer editable in property and create forms: they are held out of the tags field and merged back untouched on save, so a Gmail label can be neither added nor removed by hand. They remain visible wherever the owning plugin renders them.

  `Tag.findOrCreate` also accepts `legacyKeys`, tried when the primary key misses and rewritten to the current key in place, so a provider can rename its key source without orphaning existing tags. Used by the two renames this ships: `com.google.gmail.label` → `com.google.gmail` and `org.ietf.jmap.mailbox` → `org.ietf.jmap` (the key sits on a `Tag`, so the object's type already said "label"). The foreign key on synced _messages_, `com.google.mail`, is deliberately unchanged.

- 72b2984: `Task.edit`, `Task.setStatus`, `Task.assign` and `Task.appendHistory` write a field and the activity-log entry describing it in one transaction; an edit that changes nothing records nothing. `UpdateTask` goes through them, so a patched task now carries its own history.

  `Task` gains `reviewers` (an optional `Actor` array), `artifacts` (refs to what the task produced), and a `review` status — a task with reviewers lands there rather than `done`. Bumped to `0.5.0`.

  **Breaking:** `TaskEdit` and `TaskDraft` are gone from `@dxos/react-ui-task` — the editable surface of a task now has one definition, `Task.Edit` and `Task.Draft` in `@dxos/types`, shared by the list UI, the mutation helpers and the `UpdateTask` operation. `UpdateTask` accepts `null` to clear `description`, `priority`, `estimate` and `assignee`; it could previously set an assignee but never remove one.

  **Breaking:** `Task.Event` is now `created | updated` — the `status-changed`, `assigned`, `moved`, `commented` and `delegated` literals are gone, and a history entry's `description` is optional. Nothing wrote the log before this release, so no stored task carries a removed value.

  A plugin can now put a menu item on another plugin's object: `ObjectAction<T>` in `@dxos/app-toolkit` is the shared shape, and a host declares a capability over it. plugin-tasks declares `TaskAction`, so a task row shows contributed actions — plugin-projects contributes `Discuss in chat`, which opens a chat carrying the task in its checklist.

  **Breaking:** `TaskList.Root`'s `onTaskDelete` is replaced by `getTaskActions`, which returns the row's menu items; delete is now an ordinary action the container supplies. One item renders as a button, several as an overflow menu.

  **Breaking:** a chat's checklist no longer owns the tasks on it. `Chat.tasks` was an owning field, so adding a task re-parented it — a task delegated from a project disappeared from that project's task list. `Chat.addTask` parents what it creates, a delegated task keeps the parent it arrived with, and `Chat.deleteTask` deletes only members the chat owns. `AssistantOperation.RunPromptInChat` opens a chat and queues its first turn, which is how delegation now starts one: a session spawned outside the chat's UI carries a different model, and the mismatch terminated the running process mid-turn.

- 32353e6: Tasks, task sets and milestones are now modelled with uni-directional refs. A `TaskSet` carries an ordered `tasks` array holding **every** task in the set — sub-tasks included, so listing a set is one read rather than a tree walk — plus an ordered `milestones` array. A task states its own place with two many-to-one refs: `parentTask` for the sub-task hierarchy and `milestone` for what it counts toward (unset means backlog; a sub-task inherits its nearest ancestor's milestone unless it sets its own). The ECHO parent edge is still set alongside, but only so deletion cascades — it is no longer the membership or hierarchy mechanism.

  The new `Milestone` type (`org.dxos.type.milestone`) replaces the embedded `Goal` struct that `Project` used to carry: its `description` says what done means, and it deliberately stores **no** status, because progress is derived from the tasks filed under it. Linear and GitHub milestones now mirror onto it.

  `Project` (`0.4.0`) drops two fields as a result: `goals` (milestones replace it) and `routines` — a routine reaches its project the same way it reaches any other object, through `instructions.objects`, which is what the routine companion already queries. `artifacts` becomes an inline ref array rather than a ref to a `Collection`. Note that deleting a project no longer cascade-deletes routines that reference it.

  `SkillsAnnotation` moves from `@dxos/app-toolkit/AppAnnotation` to `@dxos/compute/Skill` (the annotation is id-keyed, so stored data is unaffected — only the import path changes). `Project` now carries the annotation (just its project skill — artifact-type skills are enabled on demand), which is what scopes a project's companion chats and template-created routines; the redundant `ProjectOperation.CreateRoutine` verb is removed — create routines through the automation companion's template menu (or `RoutineOperation.CreateRoutine`) instead.

  Breaking for anyone reading these types directly: set membership must be read from `TaskSet.tasks` instead of `Query.children()`, task writes should go through the `taskCreate`/`taskUpdate`/`taskDelete`/`taskMove` verbs (which keep the array, the refs and the parent edges consistent), and `taskCreate`'s `parent` input is now `parentTask`. Type versions bump to `taskSet@0.3.0`, `task@0.3.0` and `project@0.4.0`; no migrations are provided.

- 559acfa: Fix the TaskSet article and section surfaces never rendering (the Tasks section of a Project article was empty), and the Excalidraw plugin settings surface never rendering — both surface ids ended in a hyphenated segment, which the surface manager drops. Surface and graph-extension ids are now checked at compile time: `id` on `Surface.create`, `Surface.createWeb`, `GraphBuilder.createExtension` and `createExtensionRaw` takes `DXN.Path`, so a malformed literal is a type error instead of a contribution that silently disappears at dispatch. A computed id still falls through to the existing runtime check.
- 40b50c2: Surface a process's environment (space, conversation) on `Process.Info`, and add a trace panel filter that shows only the processes running in the selected environments.
- 85bdad2: Add `Registry.typeAtom(registry, typename)`, a reactive lookup of a registered type entity, and use it when building app-graph nodes. Objects whose schema registered after their graph node was built no longer keep the placeholder icon until an unrelated change rebuilds the node.

### Patch Changes

- af1c007: `AgentService` reads `RemoteProcessManager` from context instead of requiring it, so a stack that
  hosts only local agents keeps its `AgentService`. A `LayerSpec` stack prunes a provider whose
  requirements are unmet, which dropped `AgentService` entirely wherever no edge runtime was
  provided. `AgentServiceOptions.getRemoteManager` supplies the manager where it cannot be read
  from context.
- 106d38a: Fix type-safety and synchronization issues found by an automated code review, including a shape-compatibility encoding bug that could silently drop a selected oneof field.
- 3958355: Import `dx.config.ts` directly instead of transpiling it, so `dx registry publish` can read a plugin config from the compiled CLI.
- da37a13: `AppSpace.setupIdentitySpaces` now creates the content space before the settings space, so a new profile's default space is the first entry returned by `client.spaces.get()` rather than the internal settings space.
- 0a01ff7: Deferred ~1.7 MB of the minified JavaScript a tab loads at startup (measured on a fully activated tab, from 13.7 MB to 12.0 MB). The onboarding hero image is now an asset rather than an inlined base64 module, and emoji-mart, the mermaid grammar, bip39, the AI session runtime, the ML runtime, the EVM client, the welcome screen and the devtools chart panel all load on first use.
- 1c995c4: Hold off outbound edge networking until the worker has finished booting.

  The worker runs wa-sqlite in-process, so the edge dial, its auth-header request, and the replication that follows all compete with the boot RPCs the tab is waiting on. On a document-heavy profile the session handshake loses that race and the client reports a connect timeout — the original capture showed the edge socket landing at +24.2 s, immediately after the worker thread freed at +23.7 s, i.e. the handshake was starved by work queued ahead of it.

  `EdgeClient` gains `deferConnect` plus an idempotent `startNetworking()`: with `deferConnect` set, `open()` no longer dials and the owner decides when connecting is safe. `ClientServicesHost` takes an `autoConnect` option (default `true`) so it still dials on stack open for embedders that want that; the worker passes `autoConnect: false` and calls `startNetworking()` itself once its start sequence drains, owning the grace period. Keeping the timing with the embedder rather than the host means the host only exposes the capability.

  Only the edge dial needs an explicit gate. Subduction already returns early while the socket is not `CONNECTED` and resumes from its reconnect handler, and feed sync re-schedules its poll and push from `onReconnected`; the one gap was `FeedSyncer`'s unconditional initial poll, which would otherwise park on the send-ready trigger, so it now runs only when the socket is already up.

  Reconnect behaviour is unchanged — this gates the first attempt only.

  Also stops automatic reclamation from loading every document in a space on startup. `EchoHost`'s reclaim pass built the live directory's full transitive closure — one storage load and automerge parse per document — purely to answer `reachable.has(...)` for a handful of candidates, and did so even when there were no candidates at all. On a space with ~1k documents that held the worker thread for seconds while a tab was waiting on boot RPCs. The pass now returns before touching the live directory when nothing is up for reclamation, searches only until every candidate is resolved instead of enumerating the space, and yields to the event loop as it walks. Proving a candidate _unreachable_ still requires a full traversal — that is inherent — but it no longer blocks the thread while doing it.

- ba08e65: Evaluate `dx.config.ts` in a node subprocess, so the compiled CLI reads a plugin's config the same way every other runtime does.
- c439ba0: Replace client-side polling of feed content with a real streaming RPC (`FeedService.subscribeFeed`): the host now pushes a fresh object-set snapshot when the feed actually changes, instead of the client asking on a timer.
- 2c442f9: Reduce memory retained per feed-backed object: reconciliation now compares a digest of an object's canonical JSON rather than retaining the JSON itself, and reactive index queries release each result's serialized document once it has been hydrated. A tab with a large feed open no longer holds several copies of every item's payload.
- d62a947: Replace client-side polling of feed sync state with a real streaming RPC (`FeedService.subscribeSyncState`): the host now pushes a fresh backlog snapshot when it actually changes, instead of the client asking on a timer.
- 8ca2ac7: Reduce idle-tab churn: `TriggerDispatcher` watches its trigger list reactively instead of re-querying the database on every 1 Hz tick, and feed/sync-state polling now backs off (up to 30 s / 15 s) while nothing changes, resetting to the fast interval as soon as it does.
- 47c8d7e: `SpaceList` now assigns its invitation proxy before awaiting, so `join()` cannot observe a window where the proxy is missing while the space list opens.
- 10b1239: Fixed an app boot failure for identities holding a delegated space invitation. The invitation's `lifetime` was computed as a fractional number of seconds, which the protobuf `int32` field cannot encode, so the `queryInvitations` response failed to serialize and its stream died before delivering the snapshot that client initialization waited on. `lifetime` is now a whole number, connection-throughput stats are rounded for the same reason, `InvitationsProxy.open()` no longer blocks initialization on a stalled or failed stream, and client service stream failures are logged instead of silently dropped.
- 99e323d: Make `SqliteStorageAdapter`'s prefix queries plain index range seeks.

  `loadRange` and `removeRange` matched with `key = ? OR key GLOB ?`. The `OR` plans as `MULTI-INDEX OR`, which discards index ordering, so `ORDER BY key ASC` materialized a temp B-tree on every call. Both now select the exact key and its descendant range as two range seeks, with `loadRange` sorting in JS — free at the sizes it returns, which are usually one or two rows. Measured against a 19.5k-row table with production key shapes: 0.0148 ms → 0.0075 ms for a single-row result, 0.0372 ms → 0.0295 ms for 18 rows.

  The range bounds are anchored on the segment separator (`[prefix + '-', prefix + '.')`), not on the prefix itself. That distinction is load-bearing: bounds anchored on the prefix degrade to a raw string-prefix match, which never inspects the character after the prefix and so also returns siblings whose segment merely begins with the same text — a different document's chunks. Anchoring on the separator makes the match exact for any segment content rather than relying on ids being fixed-length, which matters because the composite key layout is protocol.

- ea11703: Replace the dead `bs-*`/`is-*`/`pli-*`/`plb-*`/`mli-*`/`mlb-*`/`pis-*`/`pie-*` Tailwind classes with their physical equivalents; they came from `tailwindcss-logical`, removed in the Tailwind v4 migration, and had been generating no CSS.
- bcfe4c5: Drop unused dependencies from several common packages, and align the `storybook` dependency of `@dxos/storybook-utils` with the version the rest of the repo resolves.
- ebb8f4a: Task-set operations now work over MCP (DX-1217). `tasks.list`, `tasks.listMilestone`, and `projects.get` load the set's member refs instead of resolving them synchronously, so a set written in one session no longer reads as empty from another; new `TaskSet.loadTasks`/`loadMilestones` carry that behaviour. `tasks.create` and `tasks.createMilestone` flush the new object before the set references it, so a crash mid-create can no longer leave the set pointing at an object that was never stored — and readers skip any dangling ref left behind. `space.updateObject` converts `{"/": "echo:..."}` ref envelopes at any depth, so ref-array properties can be patched. The project skill's setup instructions call `whoami` instead of the removed `listSpaces`.
- 24fcadc: Suppress the local OAuth callback server's per-request HTTP logs and listen banner during CLI OAuth flows (`dx account login`, `dx connector add`) unless `--verbose` is set.
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

- 19f19a2: Fix an event-loop spin in the feed pipeline when its consumer raced `start()`: with enough feeds in a space, the client-services worker could wedge during boot — pegged CPU, no RPC responses — leaving the app on the fatal startup dialog.
- 256f286: Projects gain a lifecycle `status` field (`active | paused | blocked | ended`), surfaced through the MCP-projected verbs, and plugin-projects ships a project-management skill for external agents — including the `/codeProject setup` flow that binds a repo to an existing space. The skill's key segment is `codeProject` because the segment doubles as the projected MCP prompt name and plain `project` belongs to assistant-toolkit's own skill.

  `toEffectSchema` recognizes ECHO's reference sentinel before the generic `type: 'object'` branch, so a reference node widened with structural keywords (as a wire boundary may do for schema-unaware consumers) decodes as a reference instead of a plain struct. Serialization is unchanged — persisted schemas stay byte-identical to previous releases.

  Worker (`workerd`) bundles no longer pull in React. Wrangler resolves `workerd, worker, browser` and never `node`, so a `#capabilities` map offering only `node` and `default` handed workers the browser barrel and its React surfaces. Every plugin with a headless entry now resolves a server-safe barrel under a `workerd` condition, and the `check-module-structure` guards trace with `workerd,worker` — the conditions a worker actually resolves — so a reintroduced leak fails the check instead of passing against a build that is never shipped.

- 5b504b4: Fix a stack overflow when decoding a recursive JSON schema. `toEffectSchema` inlined every `$ref` eagerly, so a self-referential or mutually-recursive schema — the only shapes for which `$defs` are emitted — recursed until the stack blew; a `$ref` now resolves through a memoized suspend. The same cycle is handled when projecting an operation's input schema into LLM-facing tool parameters, so a tool whose parameters reference themselves no longer breaks assistant requests.
- d7b0a3b: `dx registry publish` authenticates the edge upload with `DX_HUB_API_KEY` when set, so headless callers without a HALO identity can publish.
- b125655: Re-establish the ECHO document subscription when its stream drops, instead of failing every later write with "Subscription not found".
- 318bbad: Register contributed schema before first-run consumers create typed objects. `SchemaDefs` now
  contributes a `ClientCapabilities.SchemaRegistered` marker that modules writing typed objects on
  `IdentityCreated` can require, and `ManagerOptions`/`TestAppOptions` accept a `whenIdle` effect so a
  test can model a host that has not gone idle yet.
- 5d816a6: Retry an EDGE trigger force-run with exponential backoff, so a manual sync started right after a connection is created no longer fails while EDGE catches up with the client.
- 4a10672: New `useOperationHandler(operation, map?)` hook: suspensefully resolves an operation's handler as an effect fn (`(input) => Effect<Output>`), or — with `map` — as a callback-args binding (`(...args) => Effect<Output>`). The component suspends while the handler's module lazy-loads; a miss throws `NoHandlerError`. Resolution goes through the new `Capabilities.OperationHandlers` singleton — the merged reactive handler set the process manager already builds for the operation invoker, now also contributed as a capability. `OperationHandlerSet.reactive` memoizes `getHandlerFor` promises per key (invalidated when contributions change) so React's `use` can resume suspended renders, and `OperationHandlerSet.findHandler(set, definition)` is the definition-typed promise counterpart of `getHandler`.

  `useSpaceCallback` now passes the returned callback's arguments through to `fn`, so gesture handlers can build effects from per-call inputs. BREAKING: the optimistic-overlay layer is removed entirely — `useOptimisticOperation`, `OptimisticBinding`, `useOptimisticQuery`, and the `@dxos/app-framework/Optimistic` module. Local-first sync writes need no overlay; a query view is a memoized `Atom.make` over `query.atom` read with `useAtomValue`.

  New `Ref.peek()` / `Database.peek(ref)` — the target when already materialized: the pinned target or a side-effect-free working-set lookup; never throws, never triggers loading. `Ref.target` is deprecated in its favor (it loads and registers a resolution callback as side effects, and can throw). Compose `Database.peek(ref) ?? (yield* Database.load(ref))` for a sync-when-materialized read with an async fallback — an effect built only from materialized refs runs under `Effect.runSync`. `Database.load` itself is unchanged — its async resolution also settles a just-added object into its own document, which flows like branching depend on. `TaskSet.resolveParentTask` uses that composition, and its cycle check walks the candidate's `parentTask` ancestor chain (equivalent to the old subtree collection, and it sees cross-set descendants) instead of querying.

  BREAKING: `TaskOperation.MoveTask`'s input requires a `taskSet` ref alongside the task and its handler needs no services. With loaded refs the whole operation completes without an async boundary — a drop runs it with `Effect.runSync` so the write lands in the gesture frame, with no optimistic overlay — while unloaded refs (e.g. an agent caller) load asynchronously through the same path.

- cc11297: Fix tabs reporting a healthy worker connection as failing: waiting for the worker leader lock is no longer bounded by a timeout, so a follower tab stays queued for takeover instead of backing off and escalating to a persistent-failure reload. A tab whose connect fails after the worker handed out its ports can also reconnect now, rather than having every retry discarded as a duplicate session.
- ff37699: Fixed stale tool-call widgets in the chat transcript: a streaming XML tag whose content grows after it closes now re-renders instead of keeping the props it was built from.
- Updated dependencies [f8bfba0]
- Updated dependencies [e8088ea]
  - @dxos/echo-protocol@0.12.0
  - @dxos/util@0.12.0
  - @dxos/async@0.12.0
  - @dxos/effect@0.12.0
  - @dxos/log@0.12.0
  - @dxos/blob@0.12.0
  - @dxos/debug@0.12.0
  - @dxos/errors@0.12.0
  - @dxos/invariant@0.12.0
  - @dxos/keys@0.12.0
  - @dxos/node-std@0.12.0

## 0.11.1

### Patch Changes

- @dxos/async@0.11.1
- @dxos/debug@0.11.1
- @dxos/echo-protocol@0.11.1
- @dxos/effect@0.11.1
- @dxos/errors@0.11.1
- @dxos/invariant@0.11.1
- @dxos/keys@0.11.1
- @dxos/log@0.11.1
- @dxos/node-std@0.11.1
- @dxos/util@0.11.1

## 0.11.0

### Minor Changes

- f9ba47a: Agents become identity/presets (breaking, no data migration — 0.1.0 agents must be recreated): `Agent` 0.2.0 keeps only name, DID, enabled, and a typed `Instructions` ref; a chat and the agent it runs as are linked by the `CompanionTo` relation (resolved with `AgentChat.loadAgent` / `AgentChat.loadChat`), neither type referencing the other by field; durable artifacts belong to a Project collection; subscriptions and cron schedules compile to Routines whose relay qualifies events with a cheap model and forwards them onto the durable agent session.
- 4e64123: Add an `order` option to `Aggregate.items({ limit, order })`: an explicit, per-group member ordering independent of any `orderBy` elsewhere in the query. Previously a preceding `orderBy` did double duty — establishing group order and silently determining which members (and in what order) landed in a following `Aggregate.items({ limit })` — so moving that `orderBy` relative to `aggregate` could silently change which items appeared. The mailbox list now uses `order` to keep each thread's preview newest-first, independent of the query's own group ordering.
- c035062: Ambient (Google-Docs-style) document review. The default document view now overlays every author's suggestions plus comments on main, with a per-user Editing/Viewing mode governed by a product-level `ReviewRenderPolicy`; the explicit branch switcher / diff selector remains as the advanced path. Also fixes a crash when adding a comment while viewing a branch (comment anchors now resolve against the editor-bound document) and prohibits inline comments on suggestion branches. `@dxos/ui-editor` gains `suggestionsOverlay` and a `readonly` option on `comments()`.
- b5ecf54: Chats carry a typed `instructions` ref rendered into the system prompt at request time (replacing typename-based inlining of bound Instructions objects, which now bind as ordinary context objects), and the new Project skill lets the assistant file created objects into a project's artifacts collection and list them.
- 3f6ac61: Make the published `@dxos/cli` runnable, and keep React out of node and bun builds.

  `@dxos/cli@0.10.0` could not execute at all once installed from npm. Nothing marked `external` in
  the compiled binary can resolve at runtime (Bun's embedded filesystem has no `node_modules`), so the
  externals are gone and `esbuild-wasm`'s WASM is inlined; the `@dxos/node-std` shims resolve to node
  builtins, since Bun miscompiles `export * from 'node:<mod>'`; `@automerge/automerge-subduction` uses
  its self-contained `web` entry rather than the `node` one that reads a sibling file; the platform
  binary keeps its executable bit through publishing; and the pinned bun no longer leaks `--smol` into
  `process.argv`. Persistent SQLite on bun also now creates its parent directory, which any `dx`
  command needed on a machine with a stored profile but no data root.

  The binary also contained React, react-dom and the whole `react-ui` graph. `Capability.lazy`,
  `OperationHandlerSet.lazy` and `React.lazy` defer evaluation but not bundling, so plugin barrels that
  merely listed a React surface pulled it into every non-browser consumer: the plugins with a node
  variant now have node-conditioned `#capabilities`, and `plugin-sheet` a node-conditioned
  `#operations`. Headless code no longer reaches for React packages — `@effect-atom/atom` instead of
  `@effect-atom/atom-react` wherever only `Atom`/`Registry`/`Result` are used, and `@dxos/client/*`
  instead of `@dxos/react-client/*`. `@dxos/ui-editor/headless` is a new UI-free entrypoint for the
  editor helpers operation handlers need.

  Breaking:
  - `formatForDisplay` and `formatForEditing` move from `@dxos/react-ui-form` to `@dxos/schema`.
  - `renderByline` and `BylineIdentity` move from `@dxos/react-ui-transcription` to
    `@dxos/plugin-transcription`.
  - The icon list moves from `@dxos/react-ui-pickers/icons` to `@dxos/ui-types`, and that subpath is
    removed; `hues` moves from `@dxos/ui-theme` to `@dxos/ui-types` beside `ChromaticPalette`.
  - `@dxos/plugin-graph` no longer exports its React hooks from the package root — import them from
    `@dxos/plugin-graph/hooks`.
  - `@dxos/plugin-deck` and `@dxos/plugin-navtree` are browser-only: `#plugin` no longer resolves a
    `node` or `workerd` condition.

- 091ebe4: The `dx` binary no longer depends on the machine that built it: `@dxos/kv-store`'s `createLevel` moves to `@dxos/kv-store/level` so importing the package for its types no longer binds LevelDB's native addon, and Automerge's WASM is inlined rather than read from disk. `LevelDB`, `SublevelDB` and `BatchLevel` are unchanged on the main entry. Each `@dxos/cli-<platform>-<arch>` package also exposes `dx` directly, so one platform can be installed without pulling the rest.
- 46ec569: Add ECHO-core per-object time travel and subtree branching: `setTimeTravel`/`clearTimeTravel` pin a live object to a historical version (writes throw, `latestOnly` subscribers stay live), `createBranch`/`switchBranch`/`mergeBranch`/`deleteBranch` fork an object subtree into writable CRDT branches with shared history and true merge-back, and `db.branch()` returns caller-owned writable per-surface branch bindings.
- f8637f1: New `Lens` namespace: an **object lens** that views one live ECHO object through a second declared type. Sibling of the existing `Panproto` wire lens, which crosses the serialization boundary to a foreign record — an object lens never creates a second object, so reads project the base object and writes invert onto it.

  A lens binds two written-out types (`Lens.make(id, Source, Target, mapping)`), so the target's TypeScript type is the view's type and an interface written once against the target works for every source that maps to it. A lensed object reports the _target's_ typename, so surfaces and forms already written for that type resolve unchanged, while `Obj.getURI` still resolves to the underlying object.

  The mapping is partial. A target property with a same-named, type-compatible source property maps itself; one with no counterpart stores itself in the object's annotation dictionary; a name match whose types are incompatible is reported by `Lens.coverage` as suspicious rather than auto-mapped or auto-overlaid, since either would record the same fact twice and let the copies drift. `Lens.coded` covers transforms a per-property mapping cannot express, such as parsing.

  `Lens.of` returns a live handle the ordinary `Obj.*` API accepts, including `Obj.update`, which batches every assignment in its callback into a single change touching only the properties actually assigned — so two peers editing one object through different lenses merge instead of clobbering each other. `Lens.checkLaws` verifies the GetPut round trip, `Lens.register` preserves its argument's precise type, and a declarative mapping can be persisted as an ordinary ECHO object (`Lens.Object`) referencing its value conversions by registered codec name.

  `useLens` ships on the new `@dxos/echo-panproto/react` entrypoint, mirroring `@dxos/echo-react`'s `useObject` tuple and overload shape. It sits on its own subpath so the package's main entry stays React-free for worker contexts. A lens holds no state: the hook subscribes to the base object for the render schedule and projects on every render, so replicated changes, overlay writes, and character-level text edits all reproject.

  The wire lens schema moved from `src/lens.ts` to `src/wire-lens.ts`, internal to the package; the `Panproto` export surface is unchanged.

- 4e64123: Add an uncorrelated semi-join query primitive: `Filter.in(query.project('property'))` matches objects whose property is in the set of values projected from a subquery's results (`col IN (SELECT property FROM ...)`), resolved once per reactive run and re-executed when the subquery's inputs change. The mailbox list now uses this to group whole threads — across the feed and this mailbox's space-scoped drafts — instead of only the messages that directly match the active filter, so thread counts and previews reflect the full conversation.
- 7b270f2: Feed-backed objects are now live by default: `Obj.update` synchronously mutates and notifies subscribers, identity is stable across queries and re-appends, and updates persist as a background whole-object re-append. Direct property assignment on a feed-backed object outside `Obj.update` now throws instead of silently mutating in memory.
- af5fbf4: Add soft-fork support to feeds: `Feed.append(feed, items, { parent })` continues a feed from an earlier item, and `Feed.history(items)` resolves the live branch at read time. Feeds that set no parent are unaffected.

### Patch Changes

- 46ec569: Remap branch-registry document urls when a space is imported or copied (branch documents live outside `links`, so they were previously left pointing at the source space), and resolve a ref atom to `undefined` on its initial read when the target is already deleted (previously only handled on later updates).
- b8c0825: Import ECHO data-access hooks (`useQuery`, `useObject`, `useType`, `usePagination`, …) directly from `@dxos/echo-react` in Composer plugins and UI packages instead of through the `@dxos/react-client/echo` re-export, decoupling pure ECHO data access from `@dxos/react-client`.
- 7b270f2: Disposing a feed handle now drains pending local updates before tearing down its object cache, instead of discarding them. Previously an `Obj.update` followed in the same tick by a database close (or a feed-handle eviction) cleared the dirty set before the scheduled background append ran, so the write was always lost. The drain is best-effort, matching the existing append contract where a failed send is retried in the background rather than surfaced — a send that keeps failing can still leave writes unpersisted.
- d547045: Allow the object form of `GeneratorAnnotation` (`{ generator, args }`) in serialized JSON schema, so operations referencing schemas that use it (e.g. `Task`) can be registered on remote hosts. Adds a workerd entry point for the tasks plugin so its operations can run headlessly.
- 923d5be: Auto-create a recurring sync Routine when a mailbox or calendar is bound to a connection (new connection, multi-target selection, or reusing an existing connection); the toolbar "Sync" action force-runs it and disables while a sync is already in progress. Fixes a legacy-DXN compatibility gap in `refToEffectSchema` and a bug where cancelling a Gmail sync left its progress monitor stuck at "running".
- 85893fe: Fix the mailbox silently dropping a compose draft, which has no thread. A draft with no `threadId` is now created as a thread of one — keyed on a fresh id — so the mailbox list's whole-thread semi-join and conversation grouping keep it. Also align the JMAP `Email` schema with RFC 8621, where `threadId` is a required, server-set property.
- 12fd785: Fix memoized language model dynamic-value remapping: collect tokens over the normalized prompt so timestamp metadata cannot shift positional ids, and preserve per-pattern regex flags so uppercase-hex UUIDs match.
- 5f08a6a: Stop the client-side diagnostics from retaining the whole ECHO client graph. Every `QueryResultImpl` added a record to a module-level `QUERIES` set that nothing ever pruned, and while the record held no direct reference to the query, it held a `StackTrace` — which keeps an unformatted `Error`, and V8 retains a captured stack structurally, with a strong reference to each frame's receiver, until `.stack` is read. The frame for `new QueryResultImpl(...)` therefore pinned the query, its query context, the hypergraph, the client, the database and every document loaded through them: one entire client graph per query, for the lifetime of the process. On hosts that never read the diagnostics this was unbounded — a Cloudflare Worker running ECHO operations on a cron trigger OOMed after ~390 invocations. `QueryResultCache` is a `WeakDictionary` precisely so results can be collected; this defeated it.

  `QUERIES` now holds weak refs pruned by a `FinalizationRegistry`, so a query, its diagnostic and its graph collect together. `OBJECT_DIAGNOSTICS` had the same defect on a longer fuse and now stores the formatted string; being keyed by object id and never evicted, it is also capped at 1,000 entries with oldest-first eviction. `StackTrace` formats once and releases the `Error`, making the release deterministic rather than incidental, and documents the retention hazard.

- 3761762: Report writes that were never sent, and stop a scheduled callback from running concurrently with itself. `UpdateScheduler` now starts its callback from a single site: `runBlocking`/`forceTrigger` funnel into the scheduled runner instead of claiming it themselves, so two passes can no longer each claim part of the shared queue — the loss behind server-side writes arriving without their data. `RepoProxy.flush()` rejects when a batch could not be sent instead of always resolving, so a short-lived writer whose isolate is disposed the moment flush resolves can fail its operation rather than silently drop the write.
- 4bb7e3b: Chats no longer spend a `query-skills` call before every `enable-skills` — the available-skills list is already rendered into the system prompt — and project chats pre-bind the artifact-type skills, so creating the artifact you asked for costs fewer tool calls. Deleting an object now also closes planks for the objects it cascade-deletes (e.g. a project's chats), which previously stayed open pointing at removed objects.
- 686fac1: Fix: re-entering Suggesting mode no longer strikes through text typed on main in between. An unedited per-user suggestion branch whose fork point fell behind is retired and re-forked at the current heads; a branch with pending suggestions is preserved.
- ac51564: Documents created from the editor's slash/link menu are now filed in the same collection as the document they were created from, instead of the space root.
- Updated dependencies [aea1e6e]
- Updated dependencies [3f1fc67]
- Updated dependencies [6a03a30]
- Updated dependencies [f6a01e3]
  - @dxos/async@0.11.0
  - @dxos/util@0.11.0
  - @dxos/keys@0.11.0
  - @dxos/log@0.11.0
  - @dxos/effect@0.11.0
  - @dxos/echo-protocol@0.11.0
  - @dxos/debug@0.11.0
  - @dxos/errors@0.11.0
  - @dxos/invariant@0.11.0
  - @dxos/node-std@0.11.0
