---
'@dxos/client': minor
'@dxos/plugin-client': minor
---

`client.halo.inbox` relays signed messages of any type between identities (`messages`, `sendMessage`, `ack`, and a `status` that reads `account-required` when EDGE refuses an identity with no account), and space invitations now travel as inbox `Message`s rendered by the `org.dxos.role.spaceInvitation` surface. `SpaceOperation.AddMembers` reports members it admitted but could not notify in `notNotified`, deck companions can show a rail-tab count via `AppNode.makeDeckCompanion({ badge })`, and `CardTile`/`Card.Row` place leading cells in the start rail. Breaking: `inbox.notices`, `inbox.send` and `useInboxNotices` are removed (use `inbox.messages`, `inbox.sendMessage` and `useInboxMessages`), as are plugin-client's invitation toast, invitations list and account badge.
