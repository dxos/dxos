---
'@dxos/plugin-assistant': patch
---

The assistant's `createChat`, `bindChatContext`, `runPromptInNewChat` and `generateHomeSuggestions` operations now run on hosts that contribute no atom registry, such as EDGE.
