---
'@dxos/client': minor
---

The owner of a locked (personal or private) space can admit an AI agent's identity as a member, below admin, with `Space.admitContact(contact, role, { agent: true })`; the membership is marked as an agent's (`SpaceMember.agent`). `Space.admitContact` now rejects an admission the space would drop instead of resolving, and a space drops a membership credential that names no subject.
