# plugin-messenger — Tasks

Design: [`agents/superpowers/specs/2026-10-04-plugin-messenger-design.md`](../../../agents/superpowers/specs/2026-10-04-plugin-messenger-design.md).

## Phase 0: design

- [x] Explore invitation relay, plugin-inbox tiles, deck companions, multi-client stories.
- [x] Decisions 1–7 agreed (signed envelope, accept old-client loss window, default-space feed,
      contacts-only senders, deck badge, copy tile now, project registered).
- [ ] Spec reviewed by the user.

## Phase 1: transport

- [ ] `@dxos/credentials` `inbox-envelope.ts`: create/verify, device chain, id, size check + tests.
- [ ] `InboxService` RPC: `sendMessage`, `Notices.messages`.
- [ ] `InboxServiceImpl.#pull` dispatch; unknown types left pending; tests.
- [ ] `HaloInbox.messages` / `sendMessage` in client proxy.
- [ ] Lift `MemoryEdgeInbox` to `@dxos/client-services/testing`; inject into local services.

## Phase 2: plugin-messenger

- [ ] Package skeleton (private), registered in composer-app.
- [ ] `Notifications` container + feed in default space.
- [ ] `InboxMaterializer` (contact filter, meta-key dedupe, ack after write) + tests.
- [ ] `MessengerCapabilities.Sender` + `MessengerOperation.Send`.
- [ ] plugin-deck companion `badge`.
- [ ] Deck companion, `NotificationsPanel`, `NotificationTile`, filters, invitations adapter.
- [ ] `PLUGIN.mdl`, README, translations.

## Phase 3: storybook

- [ ] `Messenger/TwoUsers` two-column story with play test.

## Follow-ups

- [ ] Migrate space invitations onto the envelope.
- [ ] Shared message tile for plugin-inbox + plugin-messenger.
- [ ] Retention/pruning of the feed and `readIds`.
