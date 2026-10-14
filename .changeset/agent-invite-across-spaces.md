---
'@dxos/client': minor
'@dxos/plugin-agent': minor
---

Agents get identities of their own and join spaces the way people do. Creating an agent opens it at once while EDGE mints its identity and a space it owns in the background; that space's members are the agent's admins, Profile › Agents lists the agents you administer, and only their admins add an agent to other spaces, from a space's "Add from contacts" picker (`AppCapabilities.InviteeSource`, `AgentSpace.administeredAgents`), where it keeps one brain and one conversation with you. An agent's identity is admitted as a member of each space it is in, marked as an agent (`SpaceMember.agent`, `Space.admitContact(contact, role, { agent: true })`), which the owner of a locked space may still do though the space takes no other members. Account panels carry explicit positions (`Account.position`), and a space with no agent can create one from "Add to space".
