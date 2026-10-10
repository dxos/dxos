# @dxos/plugin-agent

## 0.13.0

### Minor Changes

- bbe9f18: Agents gain a brain: each member talks to an agent in their own private chat, the agent records facts from every turn in an RDF fact store and watches them against the goals people set, and a matching fact wakes the requester's chat with an update, relayed as a synthetic system note. The brain runs in memory locally and as a SQLite Durable Object on EDGE. Fact extraction now works with Anthropic structured output, and `@dxos/compute` adds `Process.EnvironmentService`, and `Process.currentEnvironment`.
- 388bcc1: `BrainService` splits into a knowledge base and an event base: `push` stores facts and queues an event in the outbox of every subscription they match, `query` reads facts back, and consumers drain each subscription with `take` and `ack` (`subscribe`, `subscriptions` and `unsubscribe` manage them). This replaces `addFacts`, `queryFacts`, `putTrigger`, `listTriggers` and `removeTrigger`. Fact matching moves to `Trigger.matchesPattern`, and `BrainService.matchEvent` lets a remote brain match the same way. Opening an agent's page directly no longer fails to open the private chat the first time.
- 246ee3c: Add `@dxos/plugin-agent`, an agent that talks to people through any channel, remembers them as ECHO objects, reads every conversation turn into facts, relays messages, and keeps one-time and ongoing ("keep me posted") watches whose updates it writes from the conversation's context. Every subpath of the package is a namespace: `AgentState` and `AgentKnowledge` (each with a `Root` container), one per skill (`ConversationSkill`, `GoalsSkill`, `InterviewSkill`, `ModesSkill`, `NoteTakerSkill`, `RelaySkill`), and one per type and operation set.

  `@dxos/plugin-thread` channel backends can now open direct conversations (`openDirect`), post into threads (`threads.send`), run a connection (`connection.start`/`stop`/`status`), and return a send receipt. New operations `sendToChannel`, `openDirect`, `connectChannel`, `disconnectChannel` and `getChannelStatus` dispatch to them, and the handlers are published as the `ThreadOperationHandlerSet` subpath. The Discord and Slack plugins implement these backends.

  An agent prompt can name its sender: `AgentProcess` accepts `{ prompt, sender?, properties? }` as well as a bare prompt (`AgentInput`, `makeInputMessage`), `AgentService.Session.submitPrompt` and the assistant's request and session take a `sender`, and the model sees a named sender as `[From: <name>]`. `useChatProcessor` and `AiChatProcessor` take a `sender`, and `ChatThread` takes a `userHue`.

  `Agent.loadChat` no longer picks a chat bridged from an external conversation as the agent's primary chat, and finds chats with a child-of filter so it also works on EDGE. `Agent.makeInitialized` accepts a skill ref, and `Skill.makeRef` binds a database skill as-is and any other by registry URI.

  The `ProfileOf` relation moves from `@dxos/plugin-crm` to `@dxos/types` with its typename unchanged, so existing profiles still resolve. `EdgeHttpClient.request` makes an authenticated call to any EDGE route. `pipeline-rdf` exports `DEFAULT_MODEL`. `FormInlineAnnotation` now survives the JSON-schema round trip. A plugin that declares two modules with the same id now fails when it is constructed instead of silently dropping one.

### Patch Changes

- Updated dependencies [ecd099a]
- Updated dependencies [bbe9f18]
- Updated dependencies [d2a6aad]
- Updated dependencies [162fd6d]
- Updated dependencies [aad3e41]
- Updated dependencies [44b7b80]
- Updated dependencies [bb2b672]
- Updated dependencies [c6922ce]
- Updated dependencies [cb1e218]
- Updated dependencies [1ef899b]
- Updated dependencies [1b2e9f3]
- Updated dependencies [5a27d5c]
- Updated dependencies [32f32a0]
- Updated dependencies [dc16fdd]
- Updated dependencies [66727e3]
- Updated dependencies [469e7f7]
- Updated dependencies [665261a]
- Updated dependencies [68dc875]
- Updated dependencies [2e96a73]
- Updated dependencies [ec9f207]
- Updated dependencies [945092e]
- Updated dependencies [c531b05]
- Updated dependencies [eb14798]
- Updated dependencies [3672aff]
- Updated dependencies [2f95d25]
- Updated dependencies [69a4a85]
- Updated dependencies [c7cc480]
- Updated dependencies [7d222fc]
- Updated dependencies [e99ee70]
- Updated dependencies [161f994]
- Updated dependencies [ff92c50]
- Updated dependencies [3e73e53]
- Updated dependencies [9ab98cd]
- Updated dependencies [8fc641a]
- Updated dependencies [38e2ddb]
- Updated dependencies [1894fc1]
- Updated dependencies [246ee3c]
- Updated dependencies [8ebe8d6]
- Updated dependencies [596728d]
- Updated dependencies [64f1a7a]
- Updated dependencies [7715216]
- Updated dependencies [1b37aa8]
- Updated dependencies [1737cad]
- Updated dependencies [321c99f]
- Updated dependencies [6a7bed4]
- Updated dependencies [3022878]
- Updated dependencies [c2a300a]
- Updated dependencies [17008f0]
- Updated dependencies [6ea9d4d]
- Updated dependencies [dde8f43]
- Updated dependencies [4f8e566]
- Updated dependencies [fcbb5c4]
- Updated dependencies [a449958]
- Updated dependencies [49731e1]
  - @dxos/react-ui-menu@0.13.0
  - @dxos/compute@0.13.0
  - @dxos/react-ui@0.13.0
  - @dxos/echo@0.13.0
  - @dxos/react-ui-form@0.13.0
  - @dxos/ai@0.13.0
  - @dxos/util@0.13.0
  - @dxos/types@0.13.0
  - @dxos/plugin-markdown@0.13.0
  - @dxos/app-toolkit@0.13.0
  - @dxos/app-framework@0.13.0
  - @dxos/assistant@0.13.0
  - @dxos/pipeline-rdf@0.13.0
  - @dxos/plugin-thread@0.13.0
  - @dxos/plugin-explorer@0.13.0
  - @dxos/app-graph@0.13.0
  - @dxos/react-ui-list@0.13.0
  - @dxos/echo-react@0.13.0
  - @dxos/schema@0.13.0
  - @dxos/effect@0.13.0
  - @dxos/halo-react@0.13.0
  - @dxos/errors@0.13.0
  - @dxos/keys@0.13.0
  - @dxos/ui-theme@0.13.0
