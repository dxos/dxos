# @dxos/plugin-messenger

Cross-space notifications for Composer: space invitations and short notices from contacts and
bots, each pointing at the object where the work lives.

- Messages travel as signed envelopes through the HALO inbox (`client.halo.inbox`), relayed by EDGE.
- `InboxMaterializer` stores each contact's message once in a `Notifications` feed in the default
  space, then acks it; it toasts new space invitations on the device that stored them.
- The `messenger` deck companion lists the feed (filter: all / unread / invitations) and shows the
  unread count as a badge on its rail tab.
- Other plugins send with `MessengerCapabilities.Sender`; agents and bots use
  `MessengerOperation.Send`.

The spec is [`PLUGIN.mdl`](./PLUGIN.mdl); the design is
[`2026-10-04-plugin-messenger-design.md`](../../../agents/superpowers/specs/2026-10-04-plugin-messenger-design.md).
The `Messenger/TwoUsers` story runs two clients over an in-memory relay.
