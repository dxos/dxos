---
'@dxos/app-toolkit': minor
'@dxos/plugin-agent': minor
---

Agents can join other spaces the way people do: a space's Members panel offers your agents from other spaces in its "Add from contacts" picker (through the new `AppCapabilities.InviteeSource`), and an agent added this way keeps one brain and one conversation with you across its spaces. Creating an agent also gives it an identity of its own on EDGE and a space it owns, which you join: that space's members are the agent's admins, and the new `AgentSpace` helpers list them and the agents you administer (spaces tagged `AppSpace.AGENT_SPACE_TAG`). A space with no agent can create one from "Add to space", and the create dialog offers one entry per type.
