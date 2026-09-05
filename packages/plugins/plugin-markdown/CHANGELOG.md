# @dxos/plugin-markdown

## 0.12.0

### Minor Changes

- 2800d03: New `Annotation.SetParent` marks a `Ref` field (or an array-of-`Ref` field) as owning its targets: writing a ref into the field, or creating the holder with one, now sets the target's ECHO parent automatically, so the child cascade-deletes and deep-clones with its holder. Nested struct fields and members of a discriminated union field are covered too.

  Types across the repo now declare ownership on the field instead of calling `Obj.setParent` next to every write — `Instructions.text`, `Outline.content`, `Project.{instructions,outline,taskSet,routines}`, `Chat.feed`, `Agent.instructions`, `File.data`, `Channel.backend.config`, `Document.content`, `Mailbox`/`Calendar`/`Search`/`Subscription` feeds and tag indexes, `Routine.{spec.instructions,triggers}`, `Scene.objects`, `Terra.objects`, and `Artifact.variants`. Removing a ref still does not clear the target's parent; call `Obj.setParent(child, undefined)` for that.

- 3aa3d63: Bind credentials to Claude-managed agent sessions by AccessToken reference, upsert or revoke them on a running session, and carry required scopes on the connector prompt.
- 75971ad: Add plugin management to the CLI. `dx plugin add <url>` fetches a manifest and snapshots it and the bundle under `plugins/<id>/`, so the install is self-describing on disk and needs no network afterwards; `add --dev <path>` reads a directory in place, falling back to its `dx.config.ts` when there is no built manifest, and may override a builtin of the same id. Installing asks for confirmation before any third-party code is evaluated — the plugin runs with the CLI's identity and `dx mcp serve` exposes its operations to agents — and non-interactive callers must pass `--yes`. Both enable by default (`--no-enable` stops at install) and print the resolved plugin id; `remove` deletes a snapshot or forgets a linked directory. Installed plugins register from metadata cached at install time, so a plugin's code is imported only once something enables it, and one that fails to import is reported by `dx plugin list` instead of failing every command. `dx plugin list` now reports `installed`, `enabled`, `core` and the plugin's source as separate fields rather than one collapsed status, with `--enabled` to filter; `enable`/`disable` are idempotent and fail with actionable messages. Hosts can supply their own core plugin set through `PluginManager`'s new `core` option instead of inheriting every `system`-tagged plugin, which is how telemetry, connectors and routines became disableable in the CLI; its demo plugins are no longer enabled by default. A profile whose enabled list is empty is no longer re-seeded with the defaults. A plugin installed from a URL has its `@dxos/*` imports served from the host's own modules, so it shares the CLI's instance of ECHO's schema registry and the capability system rather than loading its own copy; the shared-package list is exported as `@dxos/app-framework/SharedPackages`.
- a3b6ef0: Migrate the entire monorepo from Effect 3 to Effect 4 (`effect@4.0.0-rc.108`). **This is a breaking change**, carried as a minor because the fixed publish group is pre-1.0.

  Every `@dxos` package now builds against the consolidated `effect` package — `@effect/platform`, `@effect/rpc`, `@effect/cli`, `@effect/sql-*`, `@effect/ai` and `@effect/printer` usages moved to their `effect/unstable/*` counterparts (or were vendored where v4 ships no counterpart). Consumers embedding `@dxos` packages must be on the Effect 4 line: v3 and v4 cannot coexist in one bundle.

  Consumer-visible API consequences include: schemas are values rather than extensible classes (statics such as `SpaceId.random` are merged onto the schema value), `Schema`-derived types follow v4 shapes (`Codec`, checks instead of refinement nodes, string annotation keys), and `Either`-based results became `Result`.

  The AI tool surface changed with it. An `Operation` now projects to a **dynamic** tool carrying the JSON Schema shown to the model, because v4 describes an Effect-schema tool through the provider's structured-output codec while validating the model's arguments against the untransformed schema — a record was advertised as an array of `[key, value]` pairs but validated as an object, and an optional key was advertised nullable-and-required but validated as absent-or-`T`, so a compliant model was always rejected. Tool arguments are decoded at the execution boundary instead, which is also where a ref supplied as a URI string becomes a `Ref`. Alongside it, an open record (`Schema.Record(String, Any)`) now serializes with an explicit `additionalProperties: true`: v4 omits the keyword when the value type is unconstrained, which made a persisted schema round-trip back as a closed struct that accepted no keys.

- 8ea2bf9: Render a task set as the sub-task tree it stores, restructurable by dragging a row's handle or with `Alt`+arrow. `TaskList` gains `hierarchical`, `onTaskMove` and controlled `collapsed` state; `Listbox.Item` accepts `onKeyDown`; and the `MoveTask` operation takes an optional `parentTask` so a drop re-parents and repositions in one mutation.
- 93c7523: Enable the Plugin Manager skill in new chats on extensible hosts, and have it search the installed
  plugins for the one best suited to a request rather than only reacting to a disabled name it spots.
- 4a71ef2: Add a Plugin Manager skill so the assistant can list installed plugins — including disabled ones — and offer a disabled plugin to the user as an inline prompt whose button enables it via the new registry `EnablePlugins` operation.
- 987f7e1: Replace each plugin's `./plugin` entrypoint with an `XPlugin` namespace. **Breaking:** import the plugin from its own subpath and construct it with `make` — `import * as ChessPlugin from '@dxos/plugin-chess/ChessPlugin'; ChessPlugin.make()` in place of `import { ChessPlugin } from '@dxos/plugin-chess/plugin'; ChessPlugin()`. Plugin metadata is available as `XPlugin.meta` without loading the plugin body. **Breaking:** `@dxos/plugin-graph` no longer re-exports `@dxos/app-graph`, which now publishes per-namespace subpaths: `AppGraph`, `AppGraphBuilder` and `AppGraphNode`. The old `NodeMatcher` splits by member — the generic combinators (`whenRoot`, `whenId`, `whenNodeType`, `whenAll`, `whenAny`, `whenNot`) move to `@dxos/graph/GraphNodeMatcher` and the ECHO-aware ones (`whenEchoObject`, `whenEchoObjectMatches`, `whenEchoType`, `whenEchoTypeMatches`) to `@dxos/app-toolkit/AppNodeMatcher`.
- e7fc023: Replace each plugin's `./operations` and `./skills` barrel entrypoints with per-symbol subpaths. **Breaking:** import a handler set from its own subpath and read it off the namespace — `import * as MarkdownOperationHandlerSet from '@dxos/plugin-markdown/MarkdownOperationHandlerSet'; MarkdownOperationHandlerSet.handlers` in place of `import { MarkdownOperationHandlerSet } from '@dxos/plugin-markdown/operations'` — and import a skill from its own subpath, e.g. `import * as MarkdownSkill from '@dxos/plugin-markdown/MarkdownSkill'`. **Breaking:** plugin root barrels no longer re-export handler sets or skills, so those names must come from their subpaths. `@dxos/plugin-inbox` additionally publishes `./FeedCursor` and `./MessageExtractor`, and `@dxos/plugin-projects` renames `CodeProjectSkillDefinition` to the `./CodeProjectSkill` namespace.
- 0280a6a: Retire the `/types` aggregate entrypoint in favour of the per-namespace subpaths.

  `@dxos/plugin-*/types` re-exported every namespace of a plugin from one module, so a
  single import statically pulled in all of them. These are Effect/ECHO schemas — runtime
  values rather than erased types — so the aggregate defeated the per-namespace subpaths
  it sat alongside and kept the plugin's whole schema graph in the eager module graph.

  Breaking: the `./types` export is removed from every plugin that published it. Import the
  namespace you need instead — `@dxos/plugin-chess/Chess` rather than
  `@dxos/plugin-chess/types`. The `dxos-subpath-imports` lint rule autofixes call sites.

  Plugins whose barrel mixed namespaces with flat exports gained real modules for those
  exports (`ConnectorAnnotations`, `SettingsPath`, `AssistantOptions`, `SpaceSchema`, and
  others); plugin-client and plugin-space additionally had their `export namespace X` wrappers
  unwrapped, so `X.X.member` becomes `X.member`.

### Patch Changes

- 86d1482: Let a dev server start the agent debug port on a known session, and let plugins contribute
  slash-menu commands to the markdown editor.

  `DebugPortStartOptions` gains `session`, so a caller that already knows the id skips the
  copy-the-id handshake. `MarkdownCapabilities.MenuExtension` is a new multi capability: an entry
  names an Operation (not a callback), and contributions are grouped by the contributing plugin.

  Also renames the settings-panel operation's key to `org.dxos.operation.appToolkit.openSettings`.
  It collided with `LayoutOperation.Open`, so neither could be resolved by key alone.

- 34a8433: Order module activation by capability dependencies instead of hand-wired events.
  A module declares the capabilities it `requires` and `provides` (or a runtime
  `activatesOn` event) and the plugin manager topologically orders activation from
  that graph. Capabilities are yieldable Effect services, so accessing an undeclared
  capability or omitting a declared one is now a type error, and missing providers,
  dependency cycles, and duplicate providers fail fast with tagged errors instead of
  runtime assertions. Plugins compose as a flat chain of `Plugin.addModule` over
  module bodies authored with `Capability.lazyModule` (code-split) or
  `Capability.inlineModule` (eager), or with a per-capability maker from the new
  `AppCapability` namespace (`surface`, `settings`, `appGraphBuilder`, `translations`,
  `schema`, ...) that bakes in the module name and default provides. A module is an
  opaque `Capability.Module<Options>`, parameterized only by its options type, so a
  module export never leaks a foreign capability's type into declaration emit.

  Every plugin in the repository is migrated to this API. The plugins gain no
  behaviour of their own from the change, but any plugin defined outside the
  repository must be migrated too — the legacy API is removed, not deprecated.

  Breaking: the legacy event-wiring API is removed — `AppPlugin` and its
  `addXModule` helpers, `firesBeforeActivation`/`firesAfterActivation`, `compatFires`,
  and the ordering-only `Setup*`/`*Ready` activation events (genuine runtime events
  remain). `Capability.provide`/`provideAll` are renamed to
  `Capability.contribute`/`contributeAll`, and the untyped raw builder
  `Capability.contributes` is removed. Multi is now the default capability arity:
  `Capability.make` defines a multi (registry) capability and
  `Capability.makeSingleton` the single-provider case, both curried
  (`make<T>()(nsid)`) so the NSID literal brands the identifier. The
  `withPluginManager` `capabilities` test option now accepts `Contribution[]`.

- 3958355: Import `dx.config.ts` directly instead of transpiling it, so `dx registry publish` can read a plugin config from the compiled CLI.
- ba08e65: Evaluate `dx.config.ts` in a node subprocess, so the compiled CLI reads a plugin's config the same way every other runtime does.
- 4800a6f: Restore a markdown document's scroll position when navigating back to it: the position is now recorded as you scroll (not only when the caret moves), read back on mount, and re-anchored to the exact pixel rather than the enclosing line.
- 4c107a2: Support combining a full-text search filter with type filters via `Filter.and` — the query planner pushes the type scope down into the FTS index instead of rejecting the query as too complex. The search plugin now scopes full-text results to user-visible types (the same set the nav tree's Database section lists, plus collections), so search no longer surfaces internal objects such as views, stored schemas, or relation rows, and each result takes its icon from the type's annotation like the nav tree and cards do. Mailbox search stays scoped to the active tag view when combining free text with tag terms. Search is now a system plugin, always enabled rather than opt-in under Labs.
- 0132aab: Arrow keys move between listbox rows again when a row carries its own controls (a task row's status toggle no longer swallows the keypress), a textarea's text is inset like an input's rather than sitting against its border, and a toolbar's density now reaches the controls inside it instead of leaving them at the default size. Markdown edited in place wraps, shows a caret against a dark surface, and takes Tab straight into the text. **Breaking:** `TaskList.Create` is now `TaskList.Edit` — it edits the selected task and creates one only when nothing is selected.
- b600f72: Remove LevelDB and the `@dxos/kv-store` package. Automerge document storage, heads, and the query index are now backed exclusively by SQLite. Profile export/import no longer reads or writes a LevelDB store — legacy `KEY_VALUE` archive entries are skipped on import.
- ea11703: Replace the dead `bs-*`/`is-*`/`pli-*`/`plb-*`/`mli-*`/`mlb-*`/`pis-*`/`pie-*` Tailwind classes with their physical equivalents; they came from `tailwindcss-logical`, removed in the Tailwind v4 migration, and had been generating no CSS.
- ebb8f4a: Task-set operations now work over MCP (DX-1217). `tasks.list`, `tasks.listMilestone`, and `projects.get` load the set's member refs instead of resolving them synchronously, so a set written in one session no longer reads as empty from another; new `TaskSet.loadTasks`/`loadMilestones` carry that behaviour. `tasks.create` and `tasks.createMilestone` flush the new object before the set references it, so a crash mid-create can no longer leave the set pointing at an object that was never stored — and readers skip any dangling ref left behind. `space.updateObject` converts `{"/": "echo:..."}` ref envelopes at any depth, so ref-array properties can be patched. The project skill's setup instructions call `whoami` instead of the removed `listSpaces`.
- 1b6e258: Show recorded demos of markdown, sheet, thread, illustrator, support and search on their plugin details pages.
- 1ab4bb8: Single-entry plugin authoring: `Plugin.addModule` skips `undefined` (headless barrels stub excluded modules), module specs and makers accept an `environments` annotation, and `@dxos/app-framework` ships a `dx-plugin` bin that generates the per-environment `#capabilities` barrels (`src/capabilities/gen/`) and syncs the package.json condition map from those annotations.

  Every `@dxos/plugin-*` package now authors a single canonical `plugin.ts(x)` and `capabilities/index.ts` on this pattern, instead of hand-maintained `plugin.node.ts`/`plugin.workerd.ts`/`capabilities/{node,workerd}.ts` variants. This migration also fixed two real drift bugs the hand-maintained variants had introduced: `plugin-client` and `plugin-routine`'s node-environment `OperationHandler` now activates on the `Startup` wave, matching browser and workerd, instead of silently defaulting to `Idle`.

  `@dxos/react-ui-assistant` gains a `./translations` export so consumers can take its translation resources without pulling the React root barrel.

- 256f286: Projects gain a lifecycle `status` field (`active | paused | blocked | ended`), surfaced through the MCP-projected verbs, and plugin-projects ships a project-management skill for external agents — including the `/codeProject setup` flow that binds a repo to an existing space. The skill's key segment is `codeProject` because the segment doubles as the projected MCP prompt name and plain `project` belongs to assistant-toolkit's own skill.

  `toEffectSchema` recognizes ECHO's reference sentinel before the generic `type: 'object'` branch, so a reference node widened with structural keywords (as a wire boundary may do for schema-unaware consumers) decodes as a reference instead of a plain struct. Serialization is unchanged — persisted schemas stay byte-identical to previous releases.

  Worker (`workerd`) bundles no longer pull in React. Wrangler resolves `workerd, worker, browser` and never `node`, so a `#capabilities` map offering only `node` and `default` handed workers the browser barrel and its React surfaces. Every plugin with a headless entry now resolves a server-safe barrel under a `workerd` condition, and the `check-module-structure` guards trace with `workerd,worker` — the conditions a worker actually resolves — so a reintroduced leak fails the check instead of passing against a build that is never shipped.

- d7b0a3b: `dx registry publish` authenticates the edge upload with `DX_HUB_API_KEY` when set, so headless callers without a HALO identity can publish.
- ea11703: Add an agent debug port to the devtools hook (`dxos.debugPort`) that evaluates snippets delivered by a loopback server, and surface start/stop plus the session id in the Debug plugin's settings. Off by default, activated only by an explicit gesture, and never persisted.
- 72b2984: `Task.edit`, `Task.setStatus`, `Task.assign` and `Task.appendHistory` write a field and the activity-log entry describing it in one transaction; an edit that changes nothing records nothing. `UpdateTask` goes through them, so a patched task now carries its own history.

  `Task` gains `reviewers` (an optional `Actor` array), `artifacts` (refs to what the task produced), and a `review` status — a task with reviewers lands there rather than `done`. Bumped to `0.5.0`.

  **Breaking:** `TaskEdit` and `TaskDraft` are gone from `@dxos/react-ui-task` — the editable surface of a task now has one definition, `Task.Edit` and `Task.Draft` in `@dxos/types`, shared by the list UI, the mutation helpers and the `UpdateTask` operation. `UpdateTask` accepts `null` to clear `description`, `priority`, `estimate` and `assignee`; it could previously set an assignee but never remove one.

  **Breaking:** `Task.Event` is now `created | updated` — the `status-changed`, `assigned`, `moved`, `commented` and `delegated` literals are gone, and a history entry's `description` is optional. Nothing wrote the log before this release, so no stored task carries a removed value.

  A plugin can now put a menu item on another plugin's object: `ObjectAction<T>` in `@dxos/app-toolkit` is the shared shape, and a host declares a capability over it. plugin-tasks declares `TaskAction`, so a task row shows contributed actions — plugin-projects contributes `Discuss in chat`, which opens a chat carrying the task in its checklist.

  **Breaking:** `TaskList.Root`'s `onTaskDelete` is replaced by `getTaskActions`, which returns the row's menu items; delete is now an ordinary action the container supplies. One item renders as a button, several as an overflow menu.

  **Breaking:** a chat's checklist no longer owns the tasks on it. `Chat.tasks` was an owning field, so adding a task re-parented it — a task delegated from a project disappeared from that project's task list. `Chat.addTask` parents what it creates, a delegated task keeps the parent it arrived with, and `Chat.deleteTask` deletes only members the chat owns. `AssistantOperation.RunPromptInChat` opens a chat and queues its first turn, which is how delegation now starts one: a session spawned outside the chat's UI carries a different model, and the mismatch terminated the running process mid-turn.

- 559acfa: Fix the TaskSet article and section surfaces never rendering (the Tasks section of a Project article was empty), and the Excalidraw plugin settings surface never rendering — both surface ids ended in a hyphenated segment, which the surface manager drops. Surface and graph-extension ids are now checked at compile time: `id` on `Surface.create`, `Surface.createWeb`, `GraphBuilder.createExtension` and `createExtensionRaw` takes `DXN.Path`, so a malformed literal is a type error instead of a contribution that silently disappears at dispatch. A computed id still falls through to the existing runtime check.
- 40b50c2: Surface a process's environment (space, conversation) on `Process.Info`, and add a trace panel filter that shows only the processes running in the selected environments.
- Updated dependencies [0280a6a]
- Updated dependencies [86d1482]
- Updated dependencies [4025ffe]
- Updated dependencies [2cad6c0]
- Updated dependencies [af1c007]
- Updated dependencies [106d38a]
- Updated dependencies [d2be597]
- Updated dependencies [e2eecf2]
- Updated dependencies [2800d03]
- Updated dependencies [96f94c2]
- Updated dependencies [6d52561]
- Updated dependencies [4a0b78b]
- Updated dependencies [34a8433]
- Updated dependencies [0fe00c5]
- Updated dependencies [b8762ef]
- Updated dependencies [f3f55a8]
- Updated dependencies [85ad256]
- Updated dependencies [2d4107f]
- Updated dependencies [c56ba34]
- Updated dependencies [069e8ed]
- Updated dependencies [7becabf]
- Updated dependencies [73daef4]
- Updated dependencies [75971ad]
- Updated dependencies [3958355]
- Updated dependencies [fee7666]
- Updated dependencies [4e417e9]
- Updated dependencies [d194929]
- Updated dependencies [557e243]
- Updated dependencies [ea11703]
- Updated dependencies [5305365]
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
- Updated dependencies [0ef896f]
- Updated dependencies [777d24a]
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
- Updated dependencies [9477170]
- Updated dependencies [cc45381]
- Updated dependencies [bcfe4c5]
- Updated dependencies [12b6618]
- Updated dependencies [df0ab57]
- Updated dependencies [41e2750]
- Updated dependencies [ebb8f4a]
- Updated dependencies [4f760ce]
- Updated dependencies [557e243]
- Updated dependencies [ca34a80]
- Updated dependencies [29543ca]
- Updated dependencies [e26af7e]
- Updated dependencies [ab79741]
- Updated dependencies [40ecd44]
- Updated dependencies [24fcadc]
- Updated dependencies [1160094]
- Updated dependencies [77a2d34]
- Updated dependencies [4804da0]
- Updated dependencies [61fe676]
- Updated dependencies [d4b4919]
- Updated dependencies [63e500b]
- Updated dependencies [7c426d4]
- Updated dependencies [cd4da46]
- Updated dependencies [19f19a2]
- Updated dependencies [1ab4bb8]
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
- Updated dependencies [2513a52]
- Updated dependencies [1d6f730]
- Updated dependencies [b125655]
- Updated dependencies [f962a7d]
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
- Updated dependencies [78523d2]
- Updated dependencies [06cbe76]
- Updated dependencies [40b50c2]
- Updated dependencies [85bdad2]
- Updated dependencies [4a10672]
- Updated dependencies [ee180f6]
- Updated dependencies [79d5ecf]
- Updated dependencies [cc11297]
- Updated dependencies [ff37699]
  - @dxos/app-framework@0.12.0
  - @dxos/app-toolkit@0.12.0
  - @dxos/client@0.12.0
  - @dxos/assistant@0.12.0
  - @dxos/echo@0.12.0
  - @dxos/react-ui@0.12.0
  - @dxos/compute@0.12.0
  - @dxos/types@0.12.0
  - @dxos/plugin-client@0.12.0
  - @dxos/client-protocol@0.12.0
  - @dxos/plugin-space@0.12.0
  - @dxos/react-ui-form@0.12.0
  - @dxos/echo-client@0.12.0
  - @dxos/ui-editor@0.12.0
  - @dxos/halo@0.12.0
  - @dxos/react-ui-menu@0.12.0
  - @dxos/ui-theme@0.12.0
  - @dxos/react-ui-editor@0.12.0
  - @dxos/react-ui-components@0.12.0
  - @dxos/schema@0.12.0
  - @dxos/util@0.12.0
  - @dxos/plugin-attention@0.12.0
  - @dxos/plugin-graph@0.12.0
  - @dxos/react-client@0.12.0
  - @dxos/echo-doc@0.12.0
  - @dxos/echo-react@0.12.0
  - @dxos/versioning@0.12.0
  - @dxos/react-ui-attention@0.12.0
  - @dxos/react-ui-dnd@0.12.0
  - @dxos/halo-react@0.12.0
  - @dxos/ui@0.12.0
  - @dxos/async@0.12.0
  - @dxos/effect@0.12.0
  - @dxos/log@0.12.0
  - @dxos/invariant@0.12.0
  - @dxos/keys@0.12.0

## 0.11.1

### Patch Changes

- @dxos/ai@0.11.1
- @dxos/app-framework@0.11.1
- @dxos/app-toolkit@0.11.1
- @dxos/assistant@0.11.1
- @dxos/async@0.11.1
- @dxos/client@0.11.1
- @dxos/client-protocol@0.11.1
- @dxos/compute@0.11.1
- @dxos/echo@0.11.1
- @dxos/echo-client@0.11.1
- @dxos/echo-doc@0.11.1
- @dxos/echo-react@0.11.1
- @dxos/effect@0.11.1
- @dxos/halo@0.11.1
- @dxos/halo-react@0.11.1
- @dxos/invariant@0.11.1
- @dxos/keys@0.11.1
- @dxos/log@0.11.1
- @dxos/react-client@0.11.1
- @dxos/react-ui-attention@0.11.1
- @dxos/react-ui-components@0.11.1
- @dxos/react-ui-dnd@0.11.1
- @dxos/react-ui-editor@0.11.1
- @dxos/react-ui-form@0.11.1
- @dxos/react-ui-menu@0.11.1
- @dxos/react-ui-mosaic@0.11.1
- @dxos/schema@0.11.1
- @dxos/types@0.11.1
- @dxos/ui@0.11.1
- @dxos/ui-editor@0.11.1
- @dxos/util@0.11.1
- @dxos/versioning@0.11.1
- @dxos/plugin-attention@0.11.1
- @dxos/plugin-client@0.11.1
- @dxos/plugin-graph@0.11.1
- @dxos/plugin-preview@0.11.1
- @dxos/plugin-space@0.11.1

## 0.11.0

### Minor Changes

- 4e64123: Add an `order` option to `Aggregate.items({ limit, order })`: an explicit, per-group member ordering independent of any `orderBy` elsewhere in the query. Previously a preceding `orderBy` did double duty — establishing group order and silently determining which members (and in what order) landed in a following `Aggregate.items({ limit })` — so moving that `orderBy` relative to `aggregate` could silently change which items appeared. The mailbox list now uses `order` to keep each thread's preview newest-first, independent of the query's own group ordering.
- c035062: Ambient (Google-Docs-style) document review. The default document view now overlays every author's suggestions plus comments on main, with a per-user Editing/Viewing mode governed by a product-level `ReviewRenderPolicy`; the explicit branch switcher / diff selector remains as the advanced path. Also fixes a crash when adding a comment while viewing a branch (comment anchors now resolve against the editor-bound document) and prohibits inline comments on suggestion branches. `@dxos/ui-editor` gains `suggestionsOverlay` and a `readonly` option on `comments()`.
- 31fe0b8: Add an opt-in branch review workflow: comment threads are tagged with the branch under review and scoped to it, and a reviewer can accept an individual change from a branch (per-hunk cherry-pick via the `AcceptChange` collaboration operation) without merging the whole branch. Instant CRDT merge remains the default.
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
- dd190a0: Add `@dxos/versioning` (checkpoints, draft branches, and 3-way merge for automerge-backed ECHO objects) and document revisions and branches in Markdown: named checkpoints with read-only time travel and restore, draft branches (separate Text objects anchored to a parent revision) with 3-way merge-back, a History companion panel, a Versions section in object properties, an editor banner with a branch switcher, agent operations (create-checkpoint, create-branch, merge-branch, get-history), and a `diffView` setting selecting inline, side-by-side, or gutter diff rendering.
- 4e64123: Add an uncorrelated semi-join query primitive: `Filter.in(query.project('property'))` matches objects whose property is in the set of values projected from a subquery's results (`col IN (SELECT property FROM ...)`), resolved once per reactive run and re-executed when the subquery's inputs change. The mailbox list now uses this to group whole threads — across the feed and this mailbox's space-scoped drafts — instead of only the messages that directly match the active filter, so thread counts and previews reflect the full conversation.
- 2e10525: The editor's object picker is now a combobox: the query is typed into a search input in the popover instead of into the document, opted into per trigger via `searchTriggers`. In markdown, the picker sorts objects by name and leads with a generic "Add object" that opens the create-object dialog and inserts a link to whatever it creates. Links to internal objects no longer show a raw-URI hover tooltip.
- 77fff35: Consolidate document review into `@dxos/plugin-review`. The comment threads (previously `@dxos/plugin-comments`) and the generic version/review layer (previously in `@dxos/plugin-space`) now live in one plugin under the `ReviewCapabilities` namespace: the history companion (checkpoint/branch/merge timeline), the in-memory version-selection and review-mode state, the default review-render policy, the `HistoryProvider` opt-in, and the timeline model. `plugin-space` no longer depends on `@dxos/versioning`, and `plugin-markdown` carries no review vocabulary — it exposes a neutral `EditorBindingHook` capability that `plugin-review` contributes to.
- cec59a4: plugin-comments and plugin-versioning merge into plugin-review (one review domain: threads,
  suggestions, branches, history), and plugin-markdown becomes review-agnostic: versioning/review
  behavior reaches the editor through the new `MarkdownCapabilities.EditorBindingHook` socket, and
  the `SuggestionSourcesProvider` slot is removed. Consumers referencing the old plugin packages or
  keys (`org.dxos.plugin.comments`, `org.dxos.plugin.versioning`) migrate to `@dxos/plugin-review`
  (`org.dxos.plugin.review`).
- 77fff35: Suggesting mode (Google-Docs-style authoring). In the ambient review view, switching to Suggesting binds the editor to the current user's own suggestion branch: their typing accrues there and renders as character-level tracked changes over main (`trackChanges`), while other authors' suggestions overlay against main via `suggestions({ base })` + `rebaseHunks` (so a foreign author no longer strikes your own new text). Accept/reject controls moved into a non-clipped hover popover. `@dxos/ui-editor` gains `trackChanges`, `rebaseHunks`, `computeCharHunks`, and a `base` option on `suggestions()`.
- 6e624bd: Fold the review "Suggesting" mode into the editor view-mode dropdown. `addViewMode` now accepts an optional `ViewModeItem[]` (default the three built-in modes), threaded through `EditorToolbarFeatureFlags.viewModes`; plugin-markdown establishes a `ViewModeExtension` capability that plugin-comments implements to contribute the "Suggesting" entry, and the separate toolbar branch-selector / review-mode dropdowns are removed (the History companion covers branch switching). Single-select dropdowns now render a check on the current value (with radio semantics). Also: an author-coloured change-bar gutter on lines containing suggestions, a fix for comments flashing out of the companion on submit, and a suggestion-overlay perf improvement (compute the base/document character diff once across all authors).
- 31fe0b8: Document branches now use ECHO-core branching: new branches fork the content's automerge history (same object, CRDT merge-back — no conflict markers), the editor binds branches per surface, and checkpoint viewing pins the live document to historical heads instead of swapping in a snapshot. Legacy content-copy branches remain readable and merge textually.
- 499dde4: Move the `WithProperties` test helper from `@dxos/plugin-markdown/testing` to a new `@dxos/app-toolkit/testing` subpath export.

### Patch Changes

- 3f1fc67: Document versioning: Google-Docs-style suggestion review.
  - **@dxos/ui-editor**: `suggestChanges` (inline per-change accept/reject over a proposal) plus word-level `diffHunks`; a multi-author `suggestions({ sources })` overlay and `groupHunks` grouping; the `comments` / `diff` / `suggest` review extensions are grouped under a new `review/` folder (package barrel exports unchanged).
  - **@dxos/app-framework**: `NamePopover` moved to `@dxos/app-framework/ui`, decoupled from translations via a `submitLabel` prop.
  - **@dxos/plugin-markdown**: branch/merge/checkpoint exposed as agent skill tools; a `suggest` diff-view mode; the compare/diff overlay is reconfigured through a CodeMirror `Compartment` so switching views no longer remounts the editor (rebinding automerge / losing selection). The branch banner's Compare toggle becomes a three-way `[Base | Diff | Branch]` view selector — Base shows the parent content at the anchor read-only.
  - **@dxos/plugin-space**: `NamePopover` removed from `@dxos/plugin-space/components` (relocated to `@dxos/app-framework/ui`); `VersioningState.compare` (boolean) becomes `view` (`base | diff | branch`).
  - **@dxos/types**: new `ContentBlock.Change` (a suggested edit — `before`/`after`) so a suggestion renders through the message tile.
  - **@dxos/react-ui-thread**: `Message.Tile` renders the `change` block (struck original → proposed text) with Accept/Reject via new `onAcceptChange`/`onRejectChange` thread callbacks; `CommentThread` is decoupled from `@dxos/react-client` (metadata/activity/identity injected as props).
  - **@dxos/plugin-review**: a unified review companion — comment threads and suggestion cards in one surface. `Suggestions` reactively tracks the document's active `kind:'suggestion'` branches (one bound probe per branch) and renders each grouped change as a change-block tile, routing Accept/Reject to the durable `AcceptChange`/`RejectChange` ops.
  - **@dxos/plugin-markdown**: a `SuggestEdit` operation + "Suggest edits" authoring action that find-or-creates the caller's per-author suggestion branch and edits it.

- b8c0825: Import ECHO data-access hooks (`useQuery`, `useObject`, `useType`, `usePagination`, …) directly from `@dxos/echo-react` in Composer plugins and UI packages instead of through the `@dxos/react-client/echo` re-export, decoupling pure ECHO data access from `@dxos/react-client`.
- c58ebb7: Fix "Cannot assign to read only property" when playing a game — game variants now receive the live state object instead of a frozen snapshot, so chess moves and New Game work again. Tic-Tac-Toe now ships from the community plugins repo and is no longer built here.
- b602d44: Resolve an object's database via `Obj.getDatabase(obj)` (and its space id via `db.spaceId`) instead of `getSpace(obj).db`/`.id` in plugin data-access sites, dropping the `@dxos/client`/`@dxos/react-client` dependency where the full space handle was not needed.
- 85893fe: Fix the mailbox silently dropping a compose draft, which has no thread. A draft with no `threadId` is now created as a thread of one — keyed on a fresh id — so the mailbox list's whole-thread semi-join and conversation grouping keep it. Also align the JMAP `Email` schema with RFC 8621, where `threadId` is a required, server-set property.
- 37874ce: Move contexts, hooks, constants and helpers out of React component modules into sibling modules so each component module is a react-refresh boundary. Public package APIs are unchanged; the previously exported names are re-exported from each directory barrel.
- 4bb7e3b: Chats no longer spend a `query-skills` call before every `enable-skills` — the available-skills list is already rendered into the system prompt — and project chats pre-bind the artifact-type skills, so creating the artifact you asked for costs fewer tool calls. Deleting an object now also closes planks for the objects it cascade-deletes (e.g. a project's chats), which previously stayed open pointing at removed objects.
- ac51564: Documents created from the editor's slash/link menu are now filed in the same collection as the document they were created from, instead of the space root.
- Updated dependencies [f9ba47a]
- Updated dependencies [4e64123]
- Updated dependencies [c035062]
- Updated dependencies [aea1e6e]
- Updated dependencies [9da013f]
- Updated dependencies [e0e1a9f]
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
- Updated dependencies [ed992c2]
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
- Updated dependencies [2fe5a7a]
- Updated dependencies [7b270f2]
- Updated dependencies [7b270f2]
- Updated dependencies [af5fbf4]
- Updated dependencies [717edc0]
- Updated dependencies [d547045]
- Updated dependencies [6439417]
- Updated dependencies [ba7aabf]
- Updated dependencies [410a019]
- Updated dependencies [d958118]
- Updated dependencies [30ae5eb]
- Updated dependencies [6d2afe0]
- Updated dependencies [e65432c]
- Updated dependencies [f6a01e3]
- Updated dependencies [c9651f1]
- Updated dependencies [9cde1c6]
- Updated dependencies [5e7839e]
- Updated dependencies [923d5be]
- Updated dependencies [85893fe]
- Updated dependencies [9f7d5ad]
- Updated dependencies [6067460]
- Updated dependencies [717edc0]
- Updated dependencies [12fd785]
- Updated dependencies [6e4ac74]
- Updated dependencies [51aaffe]
- Updated dependencies [801b77f]
- Updated dependencies [d547045]
- Updated dependencies [bda1a02]
- Updated dependencies [59a65a8]
- Updated dependencies [832d150]
- Updated dependencies [aea1e6e]
- Updated dependencies [f10b1ce]
- Updated dependencies [f7d7735]
- Updated dependencies [717edc0]
- Updated dependencies [5f08a6a]
- Updated dependencies [37874ce]
- Updated dependencies [848ba1b]
- Updated dependencies [f15c632]
- Updated dependencies [3761762]
- Updated dependencies [c9da903]
- Updated dependencies [55bb048]
- Updated dependencies [bdf9f68]
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
- Updated dependencies [4f24c4e]
- Updated dependencies [ac51564]
- Updated dependencies [499dde4]
- Updated dependencies [a1c89fa]
  - @dxos/echo@0.11.0
  - @dxos/async@0.11.0
  - @dxos/schema@0.11.0
  - @dxos/react-ui@0.11.0
  - @dxos/react-ui-editor@0.11.0
  - @dxos/app-toolkit@0.11.0
  - @dxos/plugin-client@0.11.0
  - @dxos/ui-editor@0.11.0
  - @dxos/ui@0.11.0
  - @dxos/client@0.11.0
  - @dxos/echo-client@0.11.0
  - @dxos/compute@0.11.0
  - @dxos/versioning@0.11.0
  - @dxos/util@0.11.0
  - @dxos/client-protocol@0.11.0
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
  - @dxos/plugin-space@0.11.0
  - @dxos/react-client@0.11.0
  - @dxos/ai@0.11.0
  - @dxos/react-ui-menu@0.11.0
  - @dxos/assistant@0.11.0
  - @dxos/echo-doc@0.11.0
  - @dxos/plugin-preview@0.11.0
  - @dxos/plugin-graph@0.11.0
  - @dxos/plugin-attention@0.11.0
  - @dxos/react-ui-dnd@0.11.0
  - @dxos/effect@0.11.0
  - @dxos/halo-react@0.11.0
  - @dxos/invariant@0.11.0
