# @dxos/assistant

## 0.12.0

### Minor Changes

- 4025ffe: Agent process state now lives in the session feed: queued prompts are Messages carrying a queued annotation, alarms are a new `Alarm` feed record (several may be pending at once), and both are managed with regular feed CRUD. A queue entry is marked consumed only after the turn it drove, so an interrupted turn is redelivered rather than lost. `SessionLoader` is renamed `SessionStore` and gains the read/write surface (`loadState`, `loadPending`, `enqueueMessage`, `ack`, `setAlarm`, `cancelAlarm`). The chat UI surfaces both: queued prompts stack above the composer and are cancellable, the next alarm shows in the status pill, and submitting during a running turn queues behind it instead of being dropped. Breaking: `SessionLoader` no longer exists, and the set-alarm operation no longer replaces the previous alarm.
- 2cad6c0: The chat now says what a request is doing while the reader waits for the first token, instead of showing an unexplained pause.

  `@dxos/assistant` adds an ephemeral `RequestPhase` trace event (`assistant.requestPhase`) carrying the setup stage a turn has reached — `preparing`, `loading-history`, `summarizing`, `connecting-mcp`, `building-toolkit`, `encoding-prompt`, `contacting-provider` — plus a 1-based `attempt` so a request the provider makes us re-issue reads as a retry rather than a stall, and a free-form `detail` (the MCP server count, today). Emit one with `emitRequestPhase(phase, opts)`; it rides the existing ephemeral trace channel alongside `PartialBlock`, so it never reaches the durable feed. The `connecting-mcp` phase is skipped entirely when there are no servers, so a no-op stage never misreports where the wait is.

  `@dxos/plugin-assistant` exposes the latest phase on `AiChatProcessor.activity` and renders it as `Chat.Activity`, a line between the thread and the composer. It clears as soon as content streams in — the reply is the better progress report — and on the request settling, being cancelled, or failing. Mounted in the chat article, the chat dialog, and the assistant story chat.

- 78523d2: Model-facing tool names now derive from an operation's DXN key, never from `meta.name`.

  `Operation.toolName(op)` is the single derivation — strip the constant `org.dxos.function.` prefix, kebab-case each camelCase segment, join with `-`, so `org.dxos.function.markdown.create` becomes `markdown-create` and `org.dxos.function.project.artifactAdd` becomes `project-artifact-add`. Keys outside that prefix keep every segment. `Operation.toolNameFromKey` does the same for a persisted record's key.

  Both the tool runtime and `Skill.toolDefinitions` use it, so a skill's `tools` array and the names the model calls are one identifier space; the lookup that previously bridged the two is gone. This makes `meta.name` pure display copy — rewording it no longer renames a tool — and removes the live collisions where `create` was claimed by plugin-markdown, plugin-script and plugin-sheet, `open` by plugin-markdown and plugin-transcription, and `update` by plugin-markdown and plugin-script. `createToolkit` now asserts tool-name uniqueness across an assembled session toolkit.

  The derivation is not injective: kebab-casing makes `webSearch` and `web-search` converge, and
  hyphenated segments are live (`plugin-crm`, `web-search`). Two keys claiming one name is an authoring
  error, caught by `Operation.findToolNameCollisions` where the app registers every operation, and by the
  tool resolver, which fails rather than picking the first match.

  Breaking for anything that hardcodes a tool name: skill instruction texts should interpolate `Operation.toolName(Op)` rather than spell the name out, and recorded model-conversation fixtures that captured the old names must be regenerated.

### Patch Changes

- d2be597: Retry a model request the provider rejected with `InsufficientPermissions`. Anthropic returns this while a key's permissions are still propagating, and the failure previously killed the turn outright, leaving the reader with no reply. `AiRequest.runAgentTurn` now re-issues the request up to ten times, spaced two seconds apart with jitter, and only while no block of the turn has been emitted yet — so a retry can never duplicate content. The other authentication kinds (missing, expired, or invalid key) need a credential change and still surface immediately.
- 9477170: Stop a queued prompt appearing in both the queue and the transcript while the agent's turn runs.
- 40ecd44: Fix agent requests failing when a space holds an operation that takes no input. A `Schema.Void` input was rendered as `{type: 'null'}` when persisted and read back as `Schema.Null`, which the tool projection rejected — failing the entire request rather than the one tool. An operation that still cannot be projected is now logged and excluded from context instead of aborting the request.
- 74f9b30: Report a tool call the model makes to a tool that does not exist back to the model instead of failing the request, and render system-generated conversation turns instead of dropping them.
- Updated dependencies [9477170]
- Updated dependencies [af1c007]
- Updated dependencies [106d38a]
- Updated dependencies [8363f12]
- Updated dependencies [9477170]
- Updated dependencies [e2eecf2]
- Updated dependencies [2800d03]
- Updated dependencies [e954c0f]
- Updated dependencies [9ef5485]
- Updated dependencies [22bea85]
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
- Updated dependencies [4e417e9]
- Updated dependencies [49aee6c]
- Updated dependencies [ea11703]
- Updated dependencies [a3d45c4]
- Updated dependencies [da37a13]
- Updated dependencies [0a01ff7]
- Updated dependencies [1c995c4]
- Updated dependencies [7575cb6]
- Updated dependencies [a69d861]
- Updated dependencies [ba08e65]
- Updated dependencies [9817b6f]
- Updated dependencies [5fcd238]
- Updated dependencies [5e8878c]
- Updated dependencies [e094f74]
- Updated dependencies [23d2d8c]
- Updated dependencies [3e02201]
- Updated dependencies [261c821]
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
- Updated dependencies [4c107a2]
- Updated dependencies [b9d72bb]
- Updated dependencies [3e9a10f]
- Updated dependencies [8ea2bf9]
- Updated dependencies [8ca2ac7]
- Updated dependencies [0132aab]
- Updated dependencies [47c8d7e]
- Updated dependencies [10b1239]
- Updated dependencies [5180720]
- Updated dependencies [b600f72]
- Updated dependencies [99e323d]
- Updated dependencies [ea11703]
- Updated dependencies [bcfe4c5]
- Updated dependencies [12b6618]
- Updated dependencies [ebb8f4a]
- Updated dependencies [ca34a80]
- Updated dependencies [24fcadc]
- Updated dependencies [1160094]
- Updated dependencies [4804da0]
- Updated dependencies [63e500b]
- Updated dependencies [7c426d4]
- Updated dependencies [02fe893]
- Updated dependencies [cd4da46]
- Updated dependencies [19f19a2]
- Updated dependencies [a09e18e]
- Updated dependencies [fc8c80c]
- Updated dependencies [256f286]
- Updated dependencies [4689d66]
- Updated dependencies [e207c68]
- Updated dependencies [092f3be]
- Updated dependencies [5b504b4]
- Updated dependencies [eb95cd7]
- Updated dependencies [a53cabb]
- Updated dependencies [d7b0a3b]
- Updated dependencies [1482a3f]
- Updated dependencies [4663f24]
- Updated dependencies [2513a52]
- Updated dependencies [2896a58]
- Updated dependencies [b125655]
- Updated dependencies [f962a7d]
- Updated dependencies [9e91762]
- Updated dependencies [4f55909]
- Updated dependencies [f4c2702]
- Updated dependencies [318bbad]
- Updated dependencies [f8bfba0]
- Updated dependencies [ea11703]
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
- Updated dependencies [5d816a6]
- Updated dependencies [85e6347]
- Updated dependencies [578b543]
- Updated dependencies [78523d2]
- Updated dependencies [40b50c2]
- Updated dependencies [85bdad2]
- Updated dependencies [4a10672]
- Updated dependencies [ee180f6]
- Updated dependencies [cc11297]
- Updated dependencies [ff37699]
  - @dxos/compute-runtime@0.12.0
  - @dxos/echo@0.12.0
  - @dxos/ai@0.12.0
  - @dxos/protocols@0.12.0
  - @dxos/compute@0.12.0
  - @dxos/types@0.12.0
  - @dxos/echo-client@0.12.0
  - @dxos/schema@0.12.0
  - @dxos/echo-protocol@0.12.0
  - @dxos/util@0.12.0
  - @dxos/echo-doc@0.12.0
  - @dxos/mcp-client@0.12.0
  - @dxos/context@0.12.0
  - @dxos/effect@0.12.0
  - @dxos/log@0.12.0
  - @dxos/debug@0.12.0
  - @dxos/errors@0.12.0
  - @dxos/invariant@0.12.0
  - @dxos/keys@0.12.0
  - @dxos/node-std@0.12.0

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
