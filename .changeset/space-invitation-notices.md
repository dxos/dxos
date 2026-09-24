---
'@dxos/client': minor
'@dxos/plugin-client': minor
---

A host who adds a known contact to a space now sends them a signed invitation notice through EDGE.
`client.halo.inbox` exposes `notices`, `send` and `ack`; notices are verified (issuer, subject,
expiry, duplicates) before they surface, and acknowledging on one device clears them on all. Composer
shows a toast with a Join action and a Space invitations article, for senders in the contact book.
