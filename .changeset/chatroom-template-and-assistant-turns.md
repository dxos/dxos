---
'@dxos/plugin-assistant': minor
'@dxos/react-ui-assistant': patch
---

Every new chat now carries the planning skill, so a conversation can read and update the durable task checklist it already holds rather than answering task questions from nothing. A new "Coding Chatroom App" space template seeds a brief, a five-stage plan as a task tree, and a Development skill covering how work is tracked and how managed agents are briefed. `SetSessionCredentials` and `RevokeSessionCredentials` are replaced by a single `UpdateSessionCredentials` operation whose `refresh` mode re-reads every credential a running session already holds, so a rotated OAuth token no longer needs the session restarted — the two removed operations were also invisible to the model, since a `Schema.NonEmptyArray` input serialized to a JSON-schema keyword the tool resolver could not project. In the thread, a system-generated turn renders in its own framed panel again instead of as the model's own prose, and status and reasoning blocks fold into the tool run they narrate — including a run that never reaches a call — so a turn spent only narrating reads as one row rather than a widget per block.
