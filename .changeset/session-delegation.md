---
'@dxos/agent-runtime': minor
'@dxos/plugin-assistant': minor
---

`Agent.delegate` hands work to another session: a new one that starts on the caller's model, skills and context (or a named existing one), with the delegated task on its checklist and the session as the task's delegate; the delegation skill exposes it as the `delegateToSession` tool. In the chat, main now reads as one thread with no gutter, a thread working out of view is a single row pinned after the transcript instead of a card, and a subagent's waiting task and a tool run's stats no longer add rows or space to the main thread. `ChatModel` is now an interface implemented by `LiveChatModel` (formerly the `ChatModel` class) and `ReplayChatModel`, which renders a fixed list of trajectory events. The task-set section takes `filter` and `editor` options to hide its toolbar and its add-task editor, and `ScriptedScene.withoutDelays` plays a scripted scene with every delay removed.
