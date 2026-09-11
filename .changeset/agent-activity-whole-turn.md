---
'@dxos/assistant': minor
'@dxos/plugin-assistant': minor
---

The chat activity line now stays up for as long as the agent has something to report, instead of vanishing at the first streamed token — an agentic turn streams a little and then calls tools for a long time, where a cleared line reads as a finished request.

`@dxos/assistant` adds two stages to `RequestPhase`: `generating`, emitted on the first block of a generation, and `calling-tool`, emitted before each tool call with the tool's name in `detail`.

`@dxos/plugin-assistant` keeps `AiChatProcessor.activity` set until the turn settles, is cancelled, or fails, rather than clearing it on the first streamed block. `Chat.Activity` renders the tool name as part of the sentence ("Calling tool search"), and — once a turn has settled with an alarm pending — counts down to the agent's self-wake ("Waking up in 25 seconds") from the chat's earliest pending alarm; a running turn supersedes that line.
