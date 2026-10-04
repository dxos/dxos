---
'@dxos/client': minor
'@dxos/plugin-client': minor
---

`client.halo.inbox` now relays signed messages of any type between identities, through `messages`, `sendMessage` and `ack`, and space invitations travel as inbox `Message`s rendered by the `org.dxos.role.spaceInvitation` surface. Deck companions can show a count on their rail tab with `AppNode.makeDeckCompanion({ badge })`, and `withMultiClientProvider` takes an `inboxRelay` so story clients can message each other without EDGE. Breaking: `inbox.notices`, `inbox.send` and `useInboxNotices` are removed (use `inbox.messages`, `inbox.sendMessage` and `useInboxMessages`), as are plugin-client's invitation toast, invitations list and account badge.
