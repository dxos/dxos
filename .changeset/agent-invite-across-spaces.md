---
'@dxos/plugin-agent': minor
---

An agent's admins can add it to their other spaces from a space's Members › "Add from contacts" picker, where it is listed as a contact, while plugin-agent's "Create identities for agents" setting is on. Once its identity is admitted, the admin's client registers the space with EDGE and makes the agent's presence there (`AgentOperation.InviteAgent`). The agent keeps one brain across the spaces it is in, and each member keeps one conversation with it, which opening the agent in any of those spaces continues.
