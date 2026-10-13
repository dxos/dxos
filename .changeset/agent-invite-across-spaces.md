---
'@dxos/app-toolkit': minor
'@dxos/plugin-agent': minor
'@dxos/plugin-client': minor
---

Agents can join other spaces the way people do: a space's Members panel offers your agents from other spaces in its "Add from contacts" picker (through the new `AppCapabilities.InviteeSource`), and an agent added this way keeps one brain and one conversation with you across its spaces. Creating an agent also gives it an identity of its own on EDGE and a space it owns, which you join: that space's members are the agent's admins. Profile › Agents, listed after Devices, shows the agents you administer, and the new `AgentSpace` helpers (`@dxos/plugin-agent/AgentSpace`) list them and their admins (spaces tagged `AppSpace.AGENT_SPACE_TAG`). The account's panels now carry explicit positions (`Account.position`), so a plugin can place its own panel among them. A space with no agent can create one from "Add to space", and the create dialog offers one entry per type.
