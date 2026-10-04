---
'@dxos/client': minor
'@dxos/plugin-client': minor
'@dxos/types': minor
'@dxos/react-ui-card': minor
'@dxos/app-toolkit': minor
'@dxos/app-framework': minor
'@dxos/react-client': minor
---

`client.halo.inbox` now relays signed messages of any type between identities, through `messages`, `sendMessage` and `ack`, and space invitations travel as inbox `Message`s rendered by the `org.dxos.role.spaceInvitation` surface. Deck companions can show a count on their rail tab with `AppNode.makeDeckCompanion({ badge })`, and `withMultiClientProvider` takes an `inboxRelay` so story clients can message each other without EDGE. Breaking: `inbox.notices`, `inbox.send` and `useInboxNotices` are removed (use `inbox.messages`, `inbox.sendMessage` and `useInboxMessages`), as are plugin-client's invitation toast, invitations list and account badge. `Message.encodeJson` writes refs to stored objects as absolute `echo://<spaceId>/<objectId>` URIs, so a link survives the trip to another identity. `CardTile.Root` is now a grid card whose leading cells sit in the start rail, `CardTile.Header` takes a `leading` cell in place of the star, and `Row.*` pass their leading cell through `Card.Row`'s `leading` prop. `AppSurface.deckCompanion` data now types the companion's `id`, its attendable id. For stories, `withMultiClientProvider` takes a `wrapper` rendered inside each client's provider, `PluginManagerHost` (from `@dxos/app-framework/testing`) hosts a plugin app as a component, and plugin-client's `ClientPluginManager` combines them so each client runs the real plugins.
