---
'@dxos/app-toolkit': minor
'@dxos/plugin-client': minor
---

A plugin can offer invitees beside contacts in a space's "Add from contacts" picker by contributing `AppCapabilities.InviteeSource`, and `ContactPicker` lists them after the contacts. `AppSpace.AGENT_SPACE_TAG` marks an agent's own space, and `AppSpace.agentIdentityKeys` keeps agents' identities out of the contacts offered.
