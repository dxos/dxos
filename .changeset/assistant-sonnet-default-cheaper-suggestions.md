---
'@dxos/agent-runtime': patch
'@dxos/plugin-assistant': patch
---

Chats that have not picked a model now default to Claude Sonnet 5 instead of the first catalog entry (Opus 5). Space-home starter prompts skip the model until a space has five recent objects, and reuse cached prompts while the set of recent objects is unchanged (up to a week), regenerating at most hourly otherwise.
