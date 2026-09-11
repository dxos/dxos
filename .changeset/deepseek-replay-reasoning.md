---
# multiple-changesets: found running the chess-MCP eval; the adapter is @dxos/ai's, the eval is not
'@dxos/ai': patch
---

The chat-completions adapter sends an assistant turn's reasoning back to DeepSeek as `reasoning_content`. In thinking mode DeepSeek refuses a request whose earlier tool-calling turns come back without it, which ended every session at its first tool call that followed a thought.
