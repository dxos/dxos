# @dxos/pipeline-rdf

## 0.13.0

### Minor Changes

- 246ee3c: Add `@dxos/plugin-agent`, an agent that talks to people through any channel, remembers them as ECHO objects, reads every conversation turn into facts, relays messages, and keeps one-time and ongoing ("keep me posted") watches whose updates it writes from the conversation's context. Every subpath of the package is a namespace: `AgentState` and `AgentKnowledge` (each with a `Root` container), one per skill (`ConversationSkill`, `GoalsSkill`, `InterviewSkill`, `ModesSkill`, `NoteTakerSkill`, `RelaySkill`), and one per type and operation set.

  `@dxos/plugin-thread` channel backends can now open direct conversations (`openDirect`), post into threads (`threads.send`), run a connection (`connection.start`/`stop`/`status`), and return a send receipt. New operations `sendToChannel`, `openDirect`, `connectChannel`, `disconnectChannel` and `getChannelStatus` dispatch to them, and the handlers are published as the `ThreadOperationHandlerSet` subpath. The Discord and Slack plugins implement these backends.

  An agent prompt can name its sender: `AgentProcess` accepts `{ prompt, sender?, properties? }` as well as a bare prompt (`AgentInput`, `makeInputMessage`), `AgentService.Session.submitPrompt` and the assistant's request and session take a `sender`, and the model sees a named sender as `[From: <name>]`. `useChatProcessor` and `AiChatProcessor` take a `sender`, and `ChatThread` takes a `userHue`.

  `Agent.loadChat` no longer picks a chat bridged from an external conversation as the agent's primary chat, and finds chats with a child-of filter so it also works on EDGE. `Agent.makeInitialized` accepts a skill ref, and `Skill.makeRef` binds a database skill as-is and any other by registry URI.

  The `ProfileOf` relation moves from `@dxos/plugin-crm` to `@dxos/types` with its typename unchanged, so existing profiles still resolve. `EdgeHttpClient.request` makes an authenticated call to any EDGE route. `pipeline-rdf` exports `DEFAULT_MODEL`. `FormInlineAnnotation` now survives the JSON-schema round trip. A plugin that declares two modules with the same id now fails when it is constructed instead of silently dropping one.

### Patch Changes

- Updated dependencies [c6922ce]
- Updated dependencies [cb1e218]
- Updated dependencies [1b2e9f3]
- Updated dependencies [5a27d5c]
- Updated dependencies [e99ee70]
- Updated dependencies [3e73e53]
- Updated dependencies [1894fc1]
- Updated dependencies [246ee3c]
  - @dxos/ai@0.13.0
  - @dxos/util@0.13.0
  - @dxos/effect@0.13.0
  - @dxos/log@0.13.0
  - @dxos/sql-sqlite@0.13.0
  - @dxos/pipeline@0.13.0
  - @dxos/errors@0.13.0
  - @dxos/invariant@0.13.0
  - @dxos/keys@0.13.0

## 0.12.0

### Patch Changes

- Updated dependencies [8363f12]
- Updated dependencies [a7f4329]
- Updated dependencies [155ca6f]
- Updated dependencies [24cbdff]
- Updated dependencies [c50f666]
- Updated dependencies [a7f4329]
- Updated dependencies [9477170]
- Updated dependencies [0524d38]
- Updated dependencies [3c7b013]
- Updated dependencies [fd873d2]
- Updated dependencies [212361b]
- Updated dependencies [b2d5bb2]
- Updated dependencies [fd23a8b]
- Updated dependencies [49aee6c]
- Updated dependencies [b63506b]
- Updated dependencies [88e3ebd]
- Updated dependencies [a7f4329]
- Updated dependencies [7575cb6]
- Updated dependencies [3e02201]
- Updated dependencies [782a442]
- Updated dependencies [7b49616]
- Updated dependencies [472ca95]
- Updated dependencies [967b130]
- Updated dependencies [882ac2a]
- Updated dependencies [4aa6a33]
- Updated dependencies [9d2466a]
- Updated dependencies [78e5596]
- Updated dependencies [b1bb838]
- Updated dependencies [dfce73e]
- Updated dependencies [df93cc2]
- Updated dependencies [9ffccd5]
- Updated dependencies [74acdc6]
- Updated dependencies [a24c7fb]
- Updated dependencies [09fedd7]
- Updated dependencies [e8088ea]
- Updated dependencies [1a3de22]
- Updated dependencies [578b543]
- Updated dependencies [e426625]
- Updated dependencies [3d23fd7]
- Updated dependencies [6dadb41]
  - @dxos/ai@0.12.0
  - @dxos/effect@0.12.0
  - @dxos/sql-sqlite@0.12.0
  - @dxos/errors@0.12.0
  - @dxos/util@0.12.0
  - @dxos/log@0.12.0
  - @dxos/pipeline@0.12.0
  - @dxos/keys@0.12.0
  - @dxos/invariant@0.12.0

## 0.11.1

### Patch Changes

- @dxos/ai@0.11.1
- @dxos/echo@0.11.1
- @dxos/effect@0.11.1
- @dxos/errors@0.11.1
- @dxos/invariant@0.11.1
- @dxos/keys@0.11.1
- @dxos/log@0.11.1
- @dxos/pipeline@0.11.1
- @dxos/sql-sqlite@0.11.1
- @dxos/util@0.11.1

## 0.11.0

### Patch Changes

- Updated dependencies [f9ba47a]
- Updated dependencies [4e64123]
- Updated dependencies [c035062]
- Updated dependencies [46ec569]
- Updated dependencies [b5ecf54]
- Updated dependencies [3f6ac61]
- Updated dependencies [091ebe4]
- Updated dependencies [3f1fc67]
- Updated dependencies [46ec569]
- Updated dependencies [f8637f1]
- Updated dependencies [b8c0825]
- Updated dependencies [4e64123]
- Updated dependencies [6a03a30]
- Updated dependencies [7b270f2]
- Updated dependencies [7b270f2]
- Updated dependencies [af5fbf4]
- Updated dependencies [d547045]
- Updated dependencies [f6a01e3]
- Updated dependencies [923d5be]
- Updated dependencies [85893fe]
- Updated dependencies [12fd785]
- Updated dependencies [5f08a6a]
- Updated dependencies [3761762]
- Updated dependencies [bdf9f68]
- Updated dependencies [4bb7e3b]
- Updated dependencies [686fac1]
- Updated dependencies [ac51564]
  - @dxos/echo@0.11.0
  - @dxos/util@0.11.0
  - @dxos/keys@0.11.0
  - @dxos/log@0.11.0
  - @dxos/ai@0.11.0
  - @dxos/effect@0.11.0
  - @dxos/sql-sqlite@0.11.0
  - @dxos/pipeline@0.11.0
  - @dxos/errors@0.11.0
  - @dxos/invariant@0.11.0
