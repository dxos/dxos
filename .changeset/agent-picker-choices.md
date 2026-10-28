---
'@dxos/plugin-assistant': minor
---

The agent picker offers what an agent that chooses its own model lets a chat choose: its model, effort and permission mode, kept on the chat's session as `agentModel`, `agentEffort` and `agentMode`. An agent declares them as `choices` on its `AssistantCapabilities.Agent` registration. Claude Code, on this computer and on EDGE, offers Opus, Sonnet and Haiku, effort from Low to Max, and its four permission modes.
