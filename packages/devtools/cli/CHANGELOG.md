# @dxos/cli

## 0.12.0

### Minor Changes

- c649575: Add `@dxos/mcp-server`, the MCP tool and prompt surface projected from the operation registry, and `dx mcp serve`, which runs it locally over stdio against the active profile's identity and spaces — the same surface the deployed server exposes.
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

- 059900a: Observability now works outside the browser. Three internal specifiers — storage, OTel traces, and the PostHog transport — resolve per condition through package `imports`, so a node host gets the node half where it used to inline the browser stub, and the browser keeps a graph with no `posthog-node` in it. PostHog gains a `posthog-node` transport, and MCP server sessions and tool calls are a new `mcp` extension kind. Opting out now stops OTel: the exporters were constructed before the consent check, so a metric reader kept exporting on its own schedule whatever the user had chosen. `isObservabilityDisabled` reports disabled when the state cannot be read, and the first-run notice creates the profile directory it writes its marker into.

  `dx` sends usage and performance data, matching what Composer collects: an event per command, the operations plugins map to events, errors, and MCP `initialize` and `tools/call` when `dx mcp serve` is running. Events are attributed to the identity DID once there is one, and to a per-installation id before that, aliased across the transition so one person is not two. Only a released binary reports: it sends OTel through the deployment's ingestion proxy, which holds the credential server-side, and to whichever PostHog project was injected when it was built. A source checkout reports nothing unless `DX_POSTHOG_API_KEY` or `DX_OTEL_ENDPOINT` says where. Manage it with `dx telemetry [status|enable|disable]`, or `DX_DISABLE_OBSERVABILITY=true`.

### Patch Changes

- 83bfa75: Add `dx mcp serve --watch`, which reloads the MCP server on change and replays the client's handshake so the session survives the edit. Running from source, every imported source file is watched; in the released binary, the directories of `--dev`-installed plugins are.
- Updated dependencies [0280a6a]
- Updated dependencies [9477170]
- Updated dependencies [86d1482]
- Updated dependencies [4025ffe]
- Updated dependencies [62d755f]
- Updated dependencies [2cad6c0]
- Updated dependencies [af1c007]
- Updated dependencies [cd205fb]
- Updated dependencies [106d38a]
- Updated dependencies [b7d66c8]
- Updated dependencies [8363f12]
- Updated dependencies [9477170]
- Updated dependencies [d2be597]
- Updated dependencies [098a0bb]
- Updated dependencies [098a0bb]
- Updated dependencies [098a0bb]
- Updated dependencies [e2eecf2]
- Updated dependencies [2800d03]
- Updated dependencies [cd6f37f]
- Updated dependencies [9477170]
- Updated dependencies [a1075de]
- Updated dependencies [9fe88c8]
- Updated dependencies [15f952c]
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
- Updated dependencies [51c7e91]
- Updated dependencies [4521dec]
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
- Updated dependencies [4e417e9]
- Updated dependencies [2fd4095]
- Updated dependencies [49aee6c]
- Updated dependencies [ea11703]
- Updated dependencies [5305365]
- Updated dependencies [881f900]
- Updated dependencies [881f900]
- Updated dependencies [881f900]
- Updated dependencies [881f900]
- Updated dependencies [881f900]
- Updated dependencies [881f900]
- Updated dependencies [9c86066]
- Updated dependencies [a09e18e]
- Updated dependencies [a3d45c4]
- Updated dependencies [8a77160]
- Updated dependencies [881f900]
- Updated dependencies [6d28380]
- Updated dependencies [da37a13]
- Updated dependencies [0a01ff7]
- Updated dependencies [1c995c4]
- Updated dependencies [7575cb6]
- Updated dependencies [a69d861]
- Updated dependencies [ba08e65]
- Updated dependencies [dbff1e4]
- Updated dependencies [3ee20ca]
- Updated dependencies [9817b6f]
- Updated dependencies [5fcd238]
- Updated dependencies [5e8878c]
- Updated dependencies [e094f74]
- Updated dependencies [23d2d8c]
- Updated dependencies [b0953f0]
- Updated dependencies [375b863]
- Updated dependencies [3e02201]
- Updated dependencies [261c821]
- Updated dependencies [dde6714]
- Updated dependencies [4800a6f]
- Updated dependencies [a3b6ef0]
- Updated dependencies [b02fe16]
- Updated dependencies [c439ba0]
- Updated dependencies [6af130f]
- Updated dependencies [c8b7158]
- Updated dependencies [2c442f9]
- Updated dependencies [2922d36]
- Updated dependencies [d62a947]
- Updated dependencies [7d000b9]
- Updated dependencies [e56276b]
- Updated dependencies [cafa240]
- Updated dependencies [5bb340f]
- Updated dependencies [4c107a2]
- Updated dependencies [b9d72bb]
- Updated dependencies [098a0bb]
- Updated dependencies [9477170]
- Updated dependencies [84568a0]
- Updated dependencies [0ef896f]
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
- Updated dependencies [10b1239]
- Updated dependencies [9c86066]
- Updated dependencies [5180720]
- Updated dependencies [b600f72]
- Updated dependencies [99e323d]
- Updated dependencies [ea11703]
- Updated dependencies [81b5eb2]
- Updated dependencies [9477170]
- Updated dependencies [cc45381]
- Updated dependencies [bcfe4c5]
- Updated dependencies [1e2a300]
- Updated dependencies [6328de3]
- Updated dependencies [12b6618]
- Updated dependencies [fa36e26]
- Updated dependencies [098a0bb]
- Updated dependencies [df0ab57]
- Updated dependencies [e094f74]
- Updated dependencies [c649575]
- Updated dependencies [ebb8f4a]
- Updated dependencies [ca34a80]
- Updated dependencies [e26af7e]
- Updated dependencies [ab79741]
- Updated dependencies [40ecd44]
- Updated dependencies [24fcadc]
- Updated dependencies [1160094]
- Updated dependencies [77a2d34]
- Updated dependencies [4560ba3]
- Updated dependencies [5ae704b]
- Updated dependencies [4804da0]
- Updated dependencies [61fe676]
- Updated dependencies [63e500b]
- Updated dependencies [9684ee8]
- Updated dependencies [7c426d4]
- Updated dependencies [02fe893]
- Updated dependencies [242faca]
- Updated dependencies [8d62799]
- Updated dependencies [5dfa21e]
- Updated dependencies [6eaddf3]
- Updated dependencies [cd4da46]
- Updated dependencies [19f19a2]
- Updated dependencies [1b6e258]
- Updated dependencies [881f900]
- Updated dependencies [881f900]
- Updated dependencies [93c7523]
- Updated dependencies [4a71ef2]
- Updated dependencies [987f7e1]
- Updated dependencies [e7fc023]
- Updated dependencies [a09e18e]
- Updated dependencies [1ab4bb8]
- Updated dependencies [a78a66d]
- Updated dependencies [fc8c80c]
- Updated dependencies [32468c3]
- Updated dependencies [08c82f9]
- Updated dependencies [34a8433]
- Updated dependencies [256f286]
- Updated dependencies [f8ec427]
- Updated dependencies [4689d66]
- Updated dependencies [306f50d]
- Updated dependencies [881f900]
- Updated dependencies [6c881a2]
- Updated dependencies [f048062]
- Updated dependencies [e207c68]
- Updated dependencies [092f3be]
- Updated dependencies [74f9b30]
- Updated dependencies [1ca0974]
- Updated dependencies [5b504b4]
- Updated dependencies [eb95cd7]
- Updated dependencies [0b1dcbd]
- Updated dependencies [a53cabb]
- Updated dependencies [d7b0a3b]
- Updated dependencies [098a0bb]
- Updated dependencies [20e86ba]
- Updated dependencies [1482a3f]
- Updated dependencies [983fe1d]
- Updated dependencies [af1ff99]
- Updated dependencies [4663f24]
- Updated dependencies [2513a52]
- Updated dependencies [2896a58]
- Updated dependencies [098a0bb]
- Updated dependencies [b125655]
- Updated dependencies [f962a7d]
- Updated dependencies [10defed]
- Updated dependencies [0280a6a]
- Updated dependencies [9e91762]
- Updated dependencies [4f55909]
- Updated dependencies [f4c2702]
- Updated dependencies [dea5df9]
- Updated dependencies [098a0bb]
- Updated dependencies [098a0bb]
- Updated dependencies [318bbad]
- Updated dependencies [efa7836]
- Updated dependencies [678ba58]
- Updated dependencies [77d0026]
- Updated dependencies [f8bfba0]
- Updated dependencies [e288833]
- Updated dependencies [ea11703]
- Updated dependencies [886453b]
- Updated dependencies [0280a6a]
- Updated dependencies [18597fc]
- Updated dependencies [63629c5]
- Updated dependencies [881f900]
- Updated dependencies [66f381d]
- Updated dependencies [d8e9de1]
- Updated dependencies [0c92b44]
- Updated dependencies [72b2984]
- Updated dependencies [32584c9]
- Updated dependencies [32353e6]
- Updated dependencies [559acfa]
- Updated dependencies [97efbaa]
- Updated dependencies [b767bc1]
- Updated dependencies [e8088ea]
- Updated dependencies [bb94124]
- Updated dependencies [5d816a6]
- Updated dependencies [85e6347]
- Updated dependencies [059900a]
- Updated dependencies [578b543]
- Updated dependencies [78523d2]
- Updated dependencies [40b50c2]
- Updated dependencies [85bdad2]
- Updated dependencies [4a10672]
- Updated dependencies [ee180f6]
- Updated dependencies [5cefa04]
- Updated dependencies [79d5ecf]
- Updated dependencies [cc11297]
- Updated dependencies [ff37699]
  - @dxos/app-framework@0.12.0
  - @dxos/app-toolkit@0.12.0
  - @dxos/compute-runtime@0.12.0
  - @dxos/client@0.12.0
  - @dxos/plugin-markdown@0.12.0
  - @dxos/assistant@0.12.0
  - @dxos/plugin-assistant@0.12.0
  - @dxos/plugin-registry@0.12.0
  - @dxos/echo@0.12.0
  - @dxos/ai@0.12.0
  - @dxos/plugin-inbox@0.12.0
  - @dxos/assistant-toolkit@0.12.0
  - @dxos/plugin-google@0.12.0
  - @dxos/protocols@0.12.0
  - @dxos/compute@0.12.0
  - @dxos/plugin-tasks@0.12.0
  - @dxos/types@0.12.0
  - @dxos/plugin-client@0.12.0
  - @dxos/cli-util@0.12.0
  - @dxos/client-protocol@0.12.0
  - @dxos/plugin-connector@0.12.0
  - @dxos/plugin-space@0.12.0
  - @dxos/echo-client@0.12.0
  - @dxos/edge-client@0.12.0
  - @dxos/mcp-server@0.12.0
  - @dxos/observability@0.12.0
  - @dxos/plugin-observability@0.12.0
  - @dxos/plugin-projects@0.12.0
  - @dxos/plugin-jmap@0.12.0
  - @dxos/plugin-chess@0.12.0
  - @dxos/plugin-kanban@0.12.0
  - @dxos/plugin-map@0.12.0
  - @dxos/plugin-review@0.12.0
  - @dxos/plugin-routine@0.12.0
  - @dxos/plugin-sample@0.12.0
  - @dxos/plugin-script@0.12.0
  - @dxos/plugin-table@0.12.0
  - @dxos/plugin-transcription@0.12.0
  - @dxos/schema@0.12.0
  - @dxos/util@0.12.0
  - @dxos/plugin-game@0.12.0
  - @dxos/edge-compute@0.12.0
  - @dxos/introspect@0.12.0
  - @dxos/async@0.12.0
  - @dxos/context@0.12.0
  - @dxos/effect@0.12.0
  - @dxos/log@0.12.0
  - @dxos/random@0.12.0
  - @dxos/effect-atom-solid@0.12.0
  - @dxos/errors@0.12.0
  - @dxos/invariant@0.12.0
  - @dxos/keys@0.12.0

## 0.11.1

### Patch Changes

- Updated dependencies [5fde190]
  - @dxos/plugin-inbox@0.11.1
  - @dxos/ai@0.11.1
  - @dxos/app-framework@0.11.1
  - @dxos/assistant@0.11.1
  - @dxos/assistant-toolkit@0.11.1
  - @dxos/async@0.11.1
  - @dxos/cli-util@0.11.1
  - @dxos/client@0.11.1
  - @dxos/client-protocol@0.11.1
  - @dxos/client-services@0.11.1
  - @dxos/compute@0.11.1
  - @dxos/compute-runtime@0.11.1
  - @dxos/config@0.11.1
  - @dxos/context@0.11.1
  - @dxos/debug@0.11.1
  - @dxos/echo@0.11.1
  - @dxos/echo-client@0.11.1
  - @dxos/edge-client@0.11.1
  - @dxos/edge-compute@0.11.1
  - @dxos/effect@0.11.1
  - @dxos/effect-atom-solid@0.11.1
  - @dxos/errors@0.11.1
  - @dxos/introspect@0.11.1
  - @dxos/invariant@0.11.1
  - @dxos/keys@0.11.1
  - @dxos/lock-file@0.11.1
  - @dxos/log@0.11.1
  - @dxos/operation@0.11.1
  - @dxos/protocols@0.11.1
  - @dxos/random@0.11.1
  - @dxos/schema@0.11.1
  - @dxos/types@0.11.1
  - @dxos/util@0.11.1
  - @dxos/plugin-assistant@0.11.1
  - @dxos/plugin-chess@0.11.1
  - @dxos/plugin-client@0.11.1
  - @dxos/plugin-connector@0.11.1
  - @dxos/plugin-game@0.11.1
  - @dxos/plugin-kanban@0.11.1
  - @dxos/plugin-map@0.11.1
  - @dxos/plugin-markdown@0.11.1
  - @dxos/plugin-observability@0.11.1
  - @dxos/plugin-registry@0.11.1
  - @dxos/plugin-review@0.11.1
  - @dxos/plugin-routine@0.11.1
  - @dxos/plugin-sample@0.11.1
  - @dxos/plugin-script@0.11.1
  - @dxos/plugin-space@0.11.1
  - @dxos/plugin-table@0.11.1
  - @dxos/plugin-transcription@0.11.1

## 0.11.0

### Patch Changes

- d547045: Use the WebRTC transport for bun as well as node: bump node-datachannel to 0.32.3 (the 0.30.0 darwin-arm64 binary crashed under both runtimes) and remove the obsolete bun memory-transport guard. CLI `halo share` prints the joinable URL and validates `--host` as an absolute URL.
- Updated dependencies [f9ba47a]
- Updated dependencies [4e64123]
- Updated dependencies [c035062]
- Updated dependencies [aea1e6e]
- Updated dependencies [9da013f]
- Updated dependencies [c3625d3]
- Updated dependencies [48d168e]
- Updated dependencies [e0e1a9f]
- Updated dependencies [31fe0b8]
- Updated dependencies [46ec569]
- Updated dependencies [5b05d75]
- Updated dependencies [b5ecf54]
- Updated dependencies [3f6ac61]
- Updated dependencies [091ebe4]
- Updated dependencies [a77e1a2]
- Updated dependencies [a256a87]
- Updated dependencies [eec72c5]
- Updated dependencies [1a9bca1]
- Updated dependencies [68e61ca]
- Updated dependencies [724d468]
- Updated dependencies [bf013a1]
- Updated dependencies [a83d98a]
- Updated dependencies [fe63f19]
- Updated dependencies [a19443b]
- Updated dependencies [dd190a0]
- Updated dependencies [3f1fc67]
- Updated dependencies [2fb1993]
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
- Updated dependencies [d79482a]
- Updated dependencies [2e10525]
- Updated dependencies [6a03a30]
- Updated dependencies [77fff35]
- Updated dependencies [7b270f2]
- Updated dependencies [7b270f2]
- Updated dependencies [af5fbf4]
- Updated dependencies [c58ebb7]
- Updated dependencies [d547045]
- Updated dependencies [b602d44]
- Updated dependencies [98d79ec]
- Updated dependencies [6439417]
- Updated dependencies [1872bc0]
- Updated dependencies [ba7aabf]
- Updated dependencies [410a019]
- Updated dependencies [d958118]
- Updated dependencies [2a68c3b]
- Updated dependencies [30ae5eb]
- Updated dependencies [3b4a7c8]
- Updated dependencies [6dd1aa8]
- Updated dependencies [2543b63]
- Updated dependencies [33e1a3d]
- Updated dependencies [6d2afe0]
- Updated dependencies [f6a01e3]
- Updated dependencies [a2447cd]
- Updated dependencies [9cde1c6]
- Updated dependencies [0afbf15]
- Updated dependencies [0d1f866]
- Updated dependencies [5e7839e]
- Updated dependencies [923d5be]
- Updated dependencies [85893fe]
- Updated dependencies [c727a43]
- Updated dependencies [6067460]
- Updated dependencies [12fd785]
- Updated dependencies [51aaffe]
- Updated dependencies [801b77f]
- Updated dependencies [1a989ed]
- Updated dependencies [d547045]
- Updated dependencies [bda1a02]
- Updated dependencies [0a4bbde]
- Updated dependencies [832d150]
- Updated dependencies [aea1e6e]
- Updated dependencies [f7d7735]
- Updated dependencies [863e2e0]
- Updated dependencies [cec59a4]
- Updated dependencies [cd3ed11]
- Updated dependencies [5f08a6a]
- Updated dependencies [114fb98]
- Updated dependencies [37874ce]
- Updated dependencies [b591791]
- Updated dependencies [f15c632]
- Updated dependencies [3761762]
- Updated dependencies [c9da903]
- Updated dependencies [a83d98a]
- Updated dependencies [bf055c8]
- Updated dependencies [bdf9f68]
- Updated dependencies [c727a43]
- Updated dependencies [4bb7e3b]
- Updated dependencies [179afc6]
- Updated dependencies [da66270]
- Updated dependencies [41141d8]
- Updated dependencies [7b270f2]
- Updated dependencies [77fff35]
- Updated dependencies [6e624bd]
- Updated dependencies [686fac1]
- Updated dependencies [ed992c2]
- Updated dependencies [25272e3]
- Updated dependencies [0e3a1a9]
- Updated dependencies [cb14d6e]
- Updated dependencies [96109be]
- Updated dependencies [37c17cc]
- Updated dependencies [f0ec728]
- Updated dependencies [08a3eea]
- Updated dependencies [bb63d91]
- Updated dependencies [a49131a]
- Updated dependencies [31fe0b8]
- Updated dependencies [4f24c4e]
- Updated dependencies [ac51564]
- Updated dependencies [499dde4]
  - @dxos/echo@0.11.0
  - @dxos/plugin-assistant@0.11.0
  - @dxos/plugin-markdown@0.11.0
  - @dxos/async@0.11.0
  - @dxos/schema@0.11.0
  - @dxos/plugin-connector@0.11.0
  - @dxos/plugin-routine@0.11.0
  - @dxos/plugin-inbox@0.11.0
  - @dxos/plugin-client@0.11.0
  - @dxos/plugin-review@0.11.0
  - @dxos/client@0.11.0
  - @dxos/compute-runtime@0.11.0
  - @dxos/echo-client@0.11.0
  - @dxos/compute@0.11.0
  - @dxos/util@0.11.0
  - @dxos/client-protocol@0.11.0
  - @dxos/client-services@0.11.0
  - @dxos/protocols@0.11.0
  - @dxos/app-framework@0.11.0
  - @dxos/edge-compute@0.11.0
  - @dxos/keys@0.11.0
  - @dxos/types@0.11.0
  - @dxos/log@0.11.0
  - @dxos/plugin-space@0.11.0
  - @dxos/assistant-toolkit@0.11.0
  - @dxos/plugin-registry@0.11.0
  - @dxos/ai@0.11.0
  - @dxos/cli-util@0.11.0
  - @dxos/config@0.11.0
  - @dxos/edge-client@0.11.0
  - @dxos/assistant@0.11.0
  - @dxos/operation@0.11.0
  - @dxos/plugin-chess@0.11.0
  - @dxos/plugin-game@0.11.0
  - @dxos/plugin-kanban@0.11.0
  - @dxos/plugin-map@0.11.0
  - @dxos/plugin-sample@0.11.0
  - @dxos/plugin-script@0.11.0
  - @dxos/plugin-table@0.11.0
  - @dxos/plugin-transcription@0.11.0
  - @dxos/introspect@0.11.0
  - @dxos/lock-file@0.11.0
  - @dxos/plugin-observability@0.11.0
  - @dxos/context@0.11.0
  - @dxos/effect@0.11.0
  - @dxos/random@0.11.0
  - @dxos/debug@0.11.0
  - @dxos/effect-atom-solid@0.11.0
  - @dxos/errors@0.11.0
  - @dxos/invariant@0.11.0
