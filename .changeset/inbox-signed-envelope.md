---
'@dxos/client': minor
'@dxos/plugin-client': minor
---

`client.halo.inbox` now relays signed messages of any type between identities, through `messages`, `sendMessage` and `ack`. Space invitations travel as inbox `Message`s rendered by the `org.dxos.role.spaceInvitation` surface. Breaking: `inbox.notices`, `inbox.send` and `useInboxNotices` are removed (use `inbox.messages`, `inbox.sendMessage` and `useInboxMessages`), as are plugin-client's invitation toast, invitations list and account badge.
