---
'@dxos/agent-runtime': minor
'@dxos/ai': patch
'@dxos/app-framework': patch
'@dxos/assistant': minor
'@dxos/compute': minor
'@dxos/echo': patch
'@dxos/edge-client': minor
'@dxos/pipeline-rdf': minor
'@dxos/plugin-agent': minor
'@dxos/plugin-assistant': minor
'@dxos/plugin-thread': minor
'@dxos/types': minor
---

Add `@dxos/plugin-agent`, an agent that talks to people through any channel, remembers them as ECHO objects, reads every conversation turn into facts, relays messages, and keeps one-time and ongoing ("keep me posted") watches whose updates it writes from the conversation's context. Every subpath of the package is a namespace: `AgentState` and `AgentKnowledge` (each with a `Root` container), one per skill (`ConversationSkill`, `GoalsSkill`, `InterviewSkill`, `ModesSkill`, `NoteTakerSkill`, `RelaySkill`), and one per type and operation set.

`@dxos/plugin-thread` channel backends can now open direct conversations (`openDirect`), post into threads (`threads.send`), run a connection (`connection.start`/`stop`/`status`), and return a send receipt. New operations `sendToChannel`, `openDirect`, `connectChannel`, `disconnectChannel` and `getChannelStatus` dispatch to them, and the handlers are published as the `ThreadOperationHandlerSet` subpath. The Discord and Slack plugins implement these backends.

An agent prompt can name its sender: `AgentProcess` accepts `{ prompt, sender?, properties? }` as well as a bare prompt (`AgentInput`, `makeInputMessage`), `AgentService.Session.submitPrompt` and the assistant's request and session take a `sender`, and the model sees a named sender as `[From: <name>]`. `useChatProcessor` and `AiChatProcessor` take a `sender`, and `ChatThread` takes a `userHue`.

`Agent.loadChat` no longer picks a chat bridged from an external conversation as the agent's primary chat, and finds chats with a child-of filter so it also works on EDGE. `Agent.makeInitialized` accepts a skill ref, and `Skill.makeRef` binds a database skill as-is and any other by registry URI.

The `ProfileOf` relation moves from `@dxos/plugin-crm` to `@dxos/types` with its typename unchanged, so existing profiles still resolve. `EdgeHttpClient.request` makes an authenticated call to any EDGE route. `pipeline-rdf` exports `DEFAULT_MODEL`. `FormInlineAnnotation` now survives the JSON-schema round trip. A plugin that declares two modules with the same id now fails when it is constructed instead of silently dropping one.
