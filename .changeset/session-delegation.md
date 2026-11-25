---
'@dxos/agent-runtime': minor
'@dxos/plugin-assistant': minor
---

`Agent.delegate` hands work to another session: a new one that starts on the caller's model, skills and context (or a named existing one), with the delegated task on its checklist and the session as the task's delegate; the delegation skill exposes it as the `delegateToSession` tool. In plugin-assistant, `ChatModel` is now an interface implemented by `LiveChatModel` (formerly the `ChatModel` class) and the new `ReplayChatModel`, which renders a fixed list of trajectory events, and a subagent's waiting task no longer shows in the main thread as a prompt the reader sent. `ScriptedScene.withoutDelays` plays a scripted scene with every delay removed.
