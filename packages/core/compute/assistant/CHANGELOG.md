# @dxos/assistant

## 0.12.0

### Minor Changes

- 375de88: The chat activity line now stays up for as long as the agent has something to report, instead of vanishing at the first streamed token — an agentic turn streams a little and then calls tools for a long time, where a cleared line reads as a finished request.

  `@dxos/assistant` adds three stages to `RequestPhase`: `sleeping`, which the agent emits when a turn ends with only a pending alarm keeping the process resident (without it the line keeps naming the stage that turn ended in); `calling-tool`, emitted before each tool call with the tool's name in `detail`, and `generating`, which the client derives from the arriving blocks — a trace write from inside the streaming pipeline adds a yield between parsing a block and submitting it, which is observable in what that turn's tools then see.

  `@dxos/plugin-assistant` moves `AiChatProcessor.activity` to `generating` on each streamed block rather than clearing it, and keeps it set until the turn settles, is cancelled, or fails. `Chat.Activity` renders the tool name as part of the sentence ("Calling tool search"), and — once a turn has settled or the agent reports `sleeping` — counts down to the self-wake ("Waking up in 25 seconds") from the chat's earliest pending alarm, ignoring a wake time already in the past. Any other running phase supersedes that line.

- 4025ffe: Agent process state now lives in the session feed: queued prompts are Messages carrying a queued annotation, alarms are a new `Alarm` feed record (several may be pending at once), and both are managed with regular feed CRUD. A queue entry is marked consumed only after the turn it drove, so an interrupted turn is redelivered rather than lost. `SessionLoader` is renamed `SessionStore` and gains the read/write surface (`loadState`, `loadPending`, `enqueueMessage`, `ack`, `setAlarm`, `cancelAlarm`). The chat UI surfaces both: queued prompts stack above the composer and are cancellable, the next alarm shows in the status pill, and submitting during a running turn queues behind it instead of being dropped. Breaking: `SessionLoader` no longer exists, and the set-alarm operation no longer replaces the previous alarm.
- 2cad6c0: The chat now says what a request is doing while the reader waits for the first token, instead of showing an unexplained pause.

  `@dxos/assistant` adds an ephemeral `RequestPhase` trace event (`assistant.requestPhase`) carrying the setup stage a turn has reached — `preparing`, `loading-history`, `summarizing`, `connecting-mcp`, `building-toolkit`, `encoding-prompt`, `contacting-provider` — plus a 1-based `attempt` so a request the provider makes us re-issue reads as a retry rather than a stall, and a free-form `detail` (the MCP server count, today). Emit one with `emitRequestPhase(phase, opts)`; it rides the existing ephemeral trace channel alongside `PartialBlock`, so it never reaches the durable feed. The `connecting-mcp` phase is skipped entirely when there are no servers, so a no-op stage never misreports where the wait is.

  `@dxos/plugin-assistant` exposes the latest phase on `AiChatProcessor.activity` and renders it as `Chat.Activity`, a line between the thread and the composer. It clears as soon as content streams in — the reply is the better progress report — and on the request settling, being cancelled, or failing. Mounted in the chat article, the chat dialog, and the assistant story chat.

- 4ececc6: Projects and chat sessions can be archived. An archived object leaves the navigation tree but stays
  listed in the space's Database section, where its card shows an "Archived" badge and an Unarchive
  action. Types opt in with `ArchivableAnnotation`; the archive state is `ArchivedAnnotation` in the
  object's meta. `Filter.annotation(annotation)` matches entities carrying any meta annotation, and
  `Filter.annotation(annotation, value)` those whose scalar value is equal, in memory and in SQL.
- 7560ca7: A chat now carries the model it runs on. `Chat.model` holds the selection as a ref whose URI is the model DXN, and the agent process reads it off the chat it is bound to, recovering it on rehydration the way it already recovers the steering instructions — so the selection survives a remount and travels with the conversation instead of living in the caller that started the turn. `AgentService.getSession` no longer accepts a `model` option, and the `model` option on the service layer and the agent process is now `defaultModel`, applying only to a chat that has not selected one. In Composer, the chat prompt's model picker reads and writes the chat's own selection, and a model the active provider no longer serves is labelled unavailable rather than silently replaced.
- 47d48cd: Remove the unused named-entity-recognition helpers from `@dxos/assistant/extraction`. They now live in the private `@dxos/ner` package, which drops `@xenova/transformers` (and its `protobufjs` dependency) from the assistant dependency graph.
- 78523d2: Model-facing tool names now derive from an operation's DXN key, never from `meta.name`.

  `Operation.toolName(op)` is the single derivation — strip the constant `org.dxos.function.` prefix, kebab-case each camelCase segment, join with `-`, so `org.dxos.function.markdown.create` becomes `markdown-create` and `org.dxos.function.project.artifactAdd` becomes `project-artifact-add`. Keys outside that prefix keep every segment. `Operation.toolNameFromKey` does the same for a persisted record's key.

  Both the tool runtime and `Skill.toolDefinitions` use it, so a skill's `tools` array and the names the model calls are one identifier space; the lookup that previously bridged the two is gone. This makes `meta.name` pure display copy — rewording it no longer renames a tool — and removes the live collisions where `create` was claimed by plugin-markdown, plugin-script and plugin-sheet, `open` by plugin-markdown and plugin-transcription, and `update` by plugin-markdown and plugin-script. `createToolkit` now asserts tool-name uniqueness across an assembled session toolkit.

  The derivation is not injective: kebab-casing makes `webSearch` and `web-search` converge, and
  hyphenated segments are live (`plugin-crm`, `web-search`). Two keys claiming one name is an authoring
  error, caught by `Operation.findToolNameCollisions` where the app registers every operation, and by the
  tool resolver, which fails rather than picking the first match.

  Breaking for anything that hardcodes a tool name: skill instruction texts should interpolate `Operation.toolName(Op)` rather than spell the name out, and recorded model-conversation fixtures that captured the old names must be regenerated.

- f112c37: New `@dxos/react-ui-trace`: the `Timeline` commit graph and `Gantt` (moved from `@dxos/react-ui-components`), the `ProcessTree`, a presentational `TracePanel`, and the pure builders behind them — `buildExecutionGraph` (span tree → commits) and `buildSessionTimeline` (sessions, tasks and sub-agents on a time axis, now over a `Session` input rather than a `Chat`). The agent trace events (`AgentRequestBegin/End`, `CompleteBlock`, `PartialBlock`, `DelegationSpawned`, `RequestPhase`, `McpServerError`) move from `@dxos/assistant` to `@dxos/compute` `Trace`, and `Process.isHarnessHost` identifies a conversation's agent process by its annotation, so the package depends on the compute layer only. `@dxos/react-ui-components` no longer depends on `@dxos/assistant`; the message-based `useExecutionGraph` hook is gone (its two consumers inline it). `@dxos/plugin-assistant` keeps the app-bound `TracePanel` container and `useSessionTimeline`, whose lanes now carry `sessionId` instead of `chatId`.

  TracePanel: processes are multi-selectable (click selects one, meta-click toggles; selection kept in view state) and the trace narrows to the selected processes and their children; each trace line shows a `HH:mm:ss` timestamp. `Tree` gains a `multiple` selection mode where a plain click selects a row alone and a meta-click toggles it (`onSelect` reports `meta`), and `createStaticTreeModel` an `isCurrent` seed. `Accordion.Root` gains `rounded`.

### Patch Changes

- d2be597: Retry a model request the provider rejected with `InsufficientPermissions`. Anthropic returns this while a key's permissions are still propagating, and the failure previously killed the turn outright, leaving the reader with no reply. `AiRequest.runAgentTurn` now re-issues the request up to ten times, spaced two seconds apart with jitter, and only while no block of the turn has been emitted yet — so a retry can never duplicate content. The other authentication kinds (missing, expired, or invalid key) need a credential change and still surface immediately.
- ab734ba: A skill authored in a space can now be bound to a chat. Such a skill has no registry key, and the
  context binder dropped every keyless skill on the way in, so the picker's toggle did nothing at all:
  the row never ticked and the conversation never saw the skill.

  Keyless skills are now carried through the binder, and the picker addresses a skill by its object
  rather than re-looking it up by registry key — which is what silently no-oped. A space copy of a
  registry skill also now shadows the registry entry in the picker (it carries the user's edits, the
  same precedence `Skill.resolveAnnotatedSkills` already applies), and toggling it off clears either
  form from the conversation.

  `AgentService.createSession` likewise binds a skill that is already in a database as-is and
  references any other skill by its registry URI, instead of cloning it into the space through the
  deprecated `Skill.upsert` — which threw outright on a space-authored skill and would have
  substituted the pristine registry copy for a fork. Such a URI resolves through the database's own
  registry, so the assistant test layer now seeds a skill there as well as into `Registry.Service`.

- 9477170: Stop a queued prompt appearing in both the queue and the transcript while the agent's turn runs.
- 4aa6a33: MCP servers speak protocol revision 2026-07-28, which carries the client's identity and requested
  revision in each request rather than in a session opened by `initialize`. Effect moves to
  4.0.0-rc.117 for it. 2025-06-18 is still served, and everything it needs sits in `legacy-*` modules
  or under a marker naming the surface that must drop it, so removing that support later is deletion.

  `McpServer.normalizeResponse` takes the request, so a reply Effect framed as an event stream
  collapses back to its single JSON message, and a notification-only reply answers 202.
  `$mcp_initialize` is recorded once per successful handshake on either revision, and every MCP event
  carries a client name. `@dxos/log` gains a `noop` processor, which a server whose stdout carries a
  protocol selects so it logs only through the processors observability installs.

- 40ecd44: Fix agent requests failing when a space holds an operation that takes no input. A `Schema.Void` input was rendered as `{type: 'null'}` when persisted and read back as `Schema.Null`, which the tool projection rejected — failing the entire request rather than the one tool. An operation that still cannot be projected is now logged and excluded from context instead of aborting the request.
- 74f9b30: Report a tool call the model makes to a tool that does not exist back to the model instead of failing the request, and render system-generated conversation turns instead of dropping them.
- a357f0c: The chat checklist renders each task's ref as a mnemonic-labelled markdown link — `ref: [AE36U7](echo:/<space>/<object>)` instead of a bare URI — so the short form a person reads and the handle the task tools take stay together when a model pastes the line back.
- 077cd58: The `update-tasks` instructions now document a task ref as the plain `echo://` URI from the checklist line's link, matching what the tool schema accepts. They previously showed a `{ "/": "echo://…" }` wrapper, so nearly every planning call opened with a rejected `Expected string` update and recovered on a retry; the wasted round trip also disrupted multi-turn planning. The `task` field's own description is updated to match, though the tool-schema projection currently drops per-field descriptions on ref properties.
- Updated dependencies [a92ea18]
- Updated dependencies [9477170]
- Updated dependencies [0c6c186]
- Updated dependencies [af1c007]
- Updated dependencies [4862c8e]
- Updated dependencies [106d38a]
- Updated dependencies [9049c30]
- Updated dependencies [6186edc]
- Updated dependencies [e3ceced]
- Updated dependencies [8363f12]
- Updated dependencies [a7f4329]
- Updated dependencies [155ca6f]
- Updated dependencies [24cbdff]
- Updated dependencies [c50f666]
- Updated dependencies [a7f4329]
- Updated dependencies [9477170]
- Updated dependencies [0524d38]
- Updated dependencies [e2eecf2]
- Updated dependencies [2800d03]
- Updated dependencies [4ececc6]
- Updated dependencies [c95def4]
- Updated dependencies [3c7b013]
- Updated dependencies [fd873d2]
- Updated dependencies [b1dc20c]
- Updated dependencies [ac71815]
- Updated dependencies [7c87626]
- Updated dependencies [6388838]
- Updated dependencies [f82c78f]
- Updated dependencies [e954c0f]
- Updated dependencies [9ef5485]
- Updated dependencies [22bea85]
- Updated dependencies [a069511]
- Updated dependencies [066b35d]
- Updated dependencies [63fc847]
- Updated dependencies [b4ceea2]
- Updated dependencies [bdb02cd]
- Updated dependencies [48eb05d]
- Updated dependencies [0fe00c5]
- Updated dependencies [b8762ef]
- Updated dependencies [f3f55a8]
- Updated dependencies [b2d5bb2]
- Updated dependencies [73daef4]
- Updated dependencies [75971ad]
- Updated dependencies [3958355]
- Updated dependencies [fd23a8b]
- Updated dependencies [4e417e9]
- Updated dependencies [194b1d3]
- Updated dependencies [6ef35a6]
- Updated dependencies [49aee6c]
- Updated dependencies [ea11703]
- Updated dependencies [b2caee6]
- Updated dependencies [9baf25f]
- Updated dependencies [a3d45c4]
- Updated dependencies [dcf911b]
- Updated dependencies [b83b831]
- Updated dependencies [88e3ebd]
- Updated dependencies [a7f4329]
- Updated dependencies [da37a13]
- Updated dependencies [0a01ff7]
- Updated dependencies [1c995c4]
- Updated dependencies [6f4a887]
- Updated dependencies [7575cb6]
- Updated dependencies [d0beedc]
- Updated dependencies [731b264]
- Updated dependencies [a69d861]
- Updated dependencies [ba08e65]
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
- Updated dependencies [261c821]
- Updated dependencies [2e4c299]
- Updated dependencies [a3b6ef0]
- Updated dependencies [782a442]
- Updated dependencies [b02fe16]
- Updated dependencies [7b49616]
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
- Updated dependencies [51820a1]
- Updated dependencies [9ae0e5f]
- Updated dependencies [7d000b9]
- Updated dependencies [e56276b]
- Updated dependencies [66e9264]
- Updated dependencies [84362af]
- Updated dependencies [76d6fca]
- Updated dependencies [4c107a2]
- Updated dependencies [84622b1]
- Updated dependencies [e5c13e4]
- Updated dependencies [26e31c1]
- Updated dependencies [8c20ee2]
- Updated dependencies [b9d72bb]
- Updated dependencies [eeff74c]
- Updated dependencies [967b130]
- Updated dependencies [3e9a10f]
- Updated dependencies [8ea2bf9]
- Updated dependencies [5cf307d]
- Updated dependencies [6139557]
- Updated dependencies [8ca2ac7]
- Updated dependencies [72f7584]
- Updated dependencies [e94ed89]
- Updated dependencies [882ac2a]
- Updated dependencies [0132aab]
- Updated dependencies [3ea0b0f]
- Updated dependencies [47c8d7e]
- Updated dependencies [10b1239]
- Updated dependencies [490127e]
- Updated dependencies [851791f]
- Updated dependencies [608a172]
- Updated dependencies [d535d55]
- Updated dependencies [5180720]
- Updated dependencies [b600f72]
- Updated dependencies [99e323d]
- Updated dependencies [ea11703]
- Updated dependencies [bcfe4c5]
- Updated dependencies [12b6618]
- Updated dependencies [4aa6a33]
- Updated dependencies [0ac2e5f]
- Updated dependencies [9426389]
- Updated dependencies [2e5e188]
- Updated dependencies [ebb8f4a]
- Updated dependencies [9d2466a]
- Updated dependencies [ca34a80]
- Updated dependencies [9f2557b]
- Updated dependencies [a283607]
- Updated dependencies [24fcadc]
- Updated dependencies [1160094]
- Updated dependencies [b00ee72]
- Updated dependencies [4804da0]
- Updated dependencies [2bb84d8]
- Updated dependencies [63e500b]
- Updated dependencies [7c426d4]
- Updated dependencies [02fe893]
- Updated dependencies [cd4da46]
- Updated dependencies [78e5596]
- Updated dependencies [b1bb838]
- Updated dependencies [19f19a2]
- Updated dependencies [2a41efd]
- Updated dependencies [72b7606]
- Updated dependencies [a09e18e]
- Updated dependencies [142ba02]
- Updated dependencies [e1ee9dd]
- Updated dependencies [8610d9d]
- Updated dependencies [fc8c80c]
- Updated dependencies [256f286]
- Updated dependencies [4689d66]
- Updated dependencies [690dcaa]
- Updated dependencies [14c2fab]
- Updated dependencies [e207c68]
- Updated dependencies [89f2811]
- Updated dependencies [092f3be]
- Updated dependencies [5b504b4]
- Updated dependencies [eb95cd7]
- Updated dependencies [a53cabb]
- Updated dependencies [d7b0a3b]
- Updated dependencies [1482a3f]
- Updated dependencies [a574300]
- Updated dependencies [16e0588]
- Updated dependencies [4663f24]
- Updated dependencies [2513a52]
- Updated dependencies [2896a58]
- Updated dependencies [5a00dcb]
- Updated dependencies [17ed864]
- Updated dependencies [f81a4f0]
- Updated dependencies [6668dba]
- Updated dependencies [b125655]
- Updated dependencies [f962a7d]
- Updated dependencies [9e91762]
- Updated dependencies [4f55909]
- Updated dependencies [f4c2702]
- Updated dependencies [2df0297]
- Updated dependencies [3e08678]
- Updated dependencies [7407d65]
- Updated dependencies [318bbad]
- Updated dependencies [9ffccd5]
- Updated dependencies [9a3f01e]
- Updated dependencies [f8bfba0]
- Updated dependencies [ea11703]
- Updated dependencies [fa82aef]
- Updated dependencies [56276cd]
- Updated dependencies [18597fc]
- Updated dependencies [9205bd3]
- Updated dependencies [fce2060]
- Updated dependencies [bda45ac]
- Updated dependencies [63629c5]
- Updated dependencies [5885380]
- Updated dependencies [881f900]
- Updated dependencies [6a1ec57]
- Updated dependencies [d8e9de1]
- Updated dependencies [72b2984]
- Updated dependencies [693d1b4]
- Updated dependencies [32584c9]
- Updated dependencies [32353e6]
- Updated dependencies [3ea8217]
- Updated dependencies [559acfa]
- Updated dependencies [1862edc]
- Updated dependencies [97efbaa]
- Updated dependencies [e8088ea]
- Updated dependencies [1a3de22]
- Updated dependencies [5d816a6]
- Updated dependencies [85e6347]
- Updated dependencies [578b543]
- Updated dependencies [78523d2]
- Updated dependencies [40b50c2]
- Updated dependencies [f112c37]
- Updated dependencies [e64e2b5]
- Updated dependencies [85bdad2]
- Updated dependencies [e426625]
- Updated dependencies [3d23fd7]
- Updated dependencies [4a10672]
- Updated dependencies [ee180f6]
- Updated dependencies [c209b42]
- Updated dependencies [4da1052]
- Updated dependencies [eda8b55]
- Updated dependencies [cc11297]
- Updated dependencies [ff37699]
- Updated dependencies [6dadb41]
  - @dxos/echo@0.12.0
  - @dxos/compute-runtime@0.12.0
  - @dxos/ai@0.12.0
  - @dxos/echo-protocol@0.12.0
  - @dxos/schema@0.12.0
  - @dxos/compute@0.12.0
  - @dxos/effect@0.12.0
  - @dxos/protocols@0.12.0
  - @dxos/echo-client@0.12.0
  - @dxos/types@0.12.0
  - @dxos/errors@0.12.0
  - @dxos/util@0.12.0
  - @dxos/log@0.12.0
  - @dxos/mcp-client@0.12.0
  - @dxos/debug@0.12.0
  - @dxos/context@0.12.0
  - @dxos/node-std@0.12.0
  - @dxos/echo-doc@0.12.0
  - @dxos/keys@0.12.0
  - @dxos/invariant@0.12.0

## 0.11.1

### Patch Changes

- @dxos/ai@0.11.1
- @dxos/async@0.11.1
- @dxos/compute@0.11.1
- @dxos/compute-runtime@0.11.1
- @dxos/context@0.11.1
- @dxos/debug@0.11.1
- @dxos/echo@0.11.1
- @dxos/echo-client@0.11.1
- @dxos/echo-doc@0.11.1
- @dxos/echo-protocol@0.11.1
- @dxos/effect@0.11.1
- @dxos/errors@0.11.1
- @dxos/graph@0.11.1
- @dxos/invariant@0.11.1
- @dxos/keys@0.11.1
- @dxos/log@0.11.1
- @dxos/mcp-client@0.11.1
- @dxos/node-std@0.11.1
- @dxos/protocols@0.11.1
- @dxos/schema@0.11.1
- @dxos/types@0.11.1
- @dxos/util@0.11.1

## 0.11.0

### Patch Changes

- Updated dependencies [f9ba47a]
- Updated dependencies [4e64123]
- Updated dependencies [c035062]
- Updated dependencies [aea1e6e]
- Updated dependencies [9da013f]
- Updated dependencies [46ec569]
- Updated dependencies [b5ecf54]
- Updated dependencies [3f6ac61]
- Updated dependencies [091ebe4]
- Updated dependencies [1a9bca1]
- Updated dependencies [bf013a1]
- Updated dependencies [a83d98a]
- Updated dependencies [a19443b]
- Updated dependencies [3f1fc67]
- Updated dependencies [962c8cd]
- Updated dependencies [46ec569]
- Updated dependencies [f8637f1]
- Updated dependencies [b8c0825]
- Updated dependencies [4e64123]
- Updated dependencies [6a03a30]
- Updated dependencies [7b270f2]
- Updated dependencies [7b270f2]
- Updated dependencies [af5fbf4]
- Updated dependencies [d547045]
- Updated dependencies [6d2afe0]
- Updated dependencies [f6a01e3]
- Updated dependencies [5e7839e]
- Updated dependencies [923d5be]
- Updated dependencies [85893fe]
- Updated dependencies [c727a43]
- Updated dependencies [6067460]
- Updated dependencies [12fd785]
- Updated dependencies [f7d7735]
- Updated dependencies [5f08a6a]
- Updated dependencies [114fb98]
- Updated dependencies [b591791]
- Updated dependencies [3761762]
- Updated dependencies [bf055c8]
- Updated dependencies [bdf9f68]
- Updated dependencies [c727a43]
- Updated dependencies [4bb7e3b]
- Updated dependencies [7b270f2]
- Updated dependencies [686fac1]
- Updated dependencies [96109be]
- Updated dependencies [37c17cc]
- Updated dependencies [f0ec728]
- Updated dependencies [08a3eea]
- Updated dependencies [a49131a]
- Updated dependencies [4f24c4e]
- Updated dependencies [ac51564]
  - @dxos/echo@0.11.0
  - @dxos/async@0.11.0
  - @dxos/schema@0.11.0
  - @dxos/compute-runtime@0.11.0
  - @dxos/echo-client@0.11.0
  - @dxos/compute@0.11.0
  - @dxos/util@0.11.0
  - @dxos/protocols@0.11.0
  - @dxos/keys@0.11.0
  - @dxos/types@0.11.0
  - @dxos/log@0.11.0
  - @dxos/ai@0.11.0
  - @dxos/graph@0.11.0
  - @dxos/echo-doc@0.11.0
  - @dxos/context@0.11.0
  - @dxos/effect@0.11.0
  - @dxos/echo-protocol@0.11.0
  - @dxos/mcp-client@0.11.0
  - @dxos/debug@0.11.0
  - @dxos/errors@0.11.0
  - @dxos/invariant@0.11.0
  - @dxos/node-std@0.11.0
