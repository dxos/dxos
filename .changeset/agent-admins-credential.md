---
'@dxos/protocols': minor
---

Add the `AgentAdmins` credential: an agent's identity signs the list of the identities that administer it and keeps it in its HALO, and the latest list supersedes the earlier ones. `createAgentAdminsCredential` issues one and `verifyAgentAdmins` checks that the agent signed it about itself.
