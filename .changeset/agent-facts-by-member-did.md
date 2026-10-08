---
'@dxos/assistant': minor
'@dxos/plugin-agent': minor
---

An agent's chats now run on EDGE (`Agent.chatLocation`) unless a chat sets `remote: false`, so every chat shares the agent's one brain. Facts the agent records are attributed to space members by identity DID, with the display name as an optional label (`attribution.agentLabel`), and watches resolve the person they name to that member's DID and match on it (someone who is no member is matched by name, as their words are attributed); a chat with a member no longer invents a placeholder "Me" person.
