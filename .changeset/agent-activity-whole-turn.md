---
'@dxos/assistant': minor
'@dxos/plugin-assistant': minor
---

The chat activity line now stays up for as long as the agent has something to report, instead of vanishing at the first streamed token — an agentic turn streams a little and then calls tools for a long time, where a cleared line reads as a finished request.

`@dxos/assistant` adds two stages to `RequestPhase`: `calling-tool`, emitted before each tool call with the tool's name in `detail`, and `generating`, which the client derives from the arriving blocks — a trace write from inside the streaming pipeline adds a yield between parsing a block and submitting it, which is observable in what that turn's tools then see.

`@dxos/plugin-assistant` moves `AiChatProcessor.activity` to `generating` on each streamed block rather than clearing it, and keeps it set until the turn settles, is cancelled, or fails. `Chat.Activity` renders the tool name as part of the sentence ("Calling tool search"), and — once a turn has settled with an alarm pending — counts down to the agent's self-wake ("Waking up in 25 seconds") from the chat's earliest pending alarm; a running turn supersedes that line.
