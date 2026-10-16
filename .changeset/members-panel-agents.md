---
'@dxos/app-toolkit': minor
'@dxos/plugin-client': patch
---

`AppSpace.AGENT_SPACE_TAG` marks the space an agent's own identity owns, and `AppSpace.agentsNotAdministeredBy` lists the agents in those spaces that an identity may not add elsewhere. A space's "Add from contacts" picker leaves those agents out, so it offers only the agents you administer, as ordinary contacts.
