---
'@dxos/assistant': minor
'@dxos/plugin-agent': minor
---

An agent's chats now always run on EDGE (`Agent.chatLocation`), so every chat shares the agent's one brain. Facts the agent records are attributed to space members by identity DID, with the display name as an optional label (`attribution.agentLabel`), and watches resolve the person they name to that member's DID and match on it; a chat with a member no longer invents a placeholder "Me" person.
