---
'@dxos/plugin-inbox': patch
---

Gmail sync on EDGE no longer fails with `Schema not registered Schema: org.dxos.type.person` when a new sender becomes a contact: the Inbox plugin now registers the `Person` type.
