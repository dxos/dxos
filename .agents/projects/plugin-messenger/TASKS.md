# plugin-messenger — Tasks

Design: [`agents/superpowers/specs/2026-10-04-plugin-messenger-design.md`](../../../agents/superpowers/specs/2026-10-04-plugin-messenger-design.md).

## Phase 0: design

- [x] Explore invitation relay, plugin-inbox tiles, deck companions, multi-client stories.
- [x] Decisions 1–7 agreed (signed envelope, accept old-client loss window, default-space feed,
      contacts-only senders, deck badge, copy tile now, project registered);
      8: invitations stored as messages, envelope migration in Phase 1, toast on materialization.
- [ ] Spec reviewed by the user.

## Phase 1: transport

- [ ] `@dxos/credentials` `inbox-envelope.ts`: create/verify, device chain, id, size check + tests.
- [ ] `InboxServiceImpl.#pull` dispatch; unknown types left pending; tests.
- [ ] `HaloInbox.messages` / `sendMessage` in client proxy.
- [ ] `InboxService` message-only: `send`/`Notices` replaced; legacy credential → invitation message.
- [ ] `SpaceInvitationMessage` in app-toolkit; plugin-space sends via `sendMessage`.
- [ ] Lift `MemoryEdgeInbox` to `@dxos/client-services/testing`; inject into local services.

## Phase 2: plugin-messenger

- [ ] Package skeleton (private), registered in `plugin-defs.core.tsx`.
- [ ] `Notifications` container + feed in default space.
- [ ] `InboxMaterializer` (contact filter, meta-key dedupe, ack after write, invitation toast) + tests.
- [ ] `MessengerCapabilities.Sender` + `MessengerOperation.Send`.
- [ ] plugin-deck companion `badge`.
- [ ] Deck companion, `NotificationsPanel`, `NotificationTile`, filters.
- [ ] plugin-client (same PR as the materializer, so invitations are never unannounced): `spaceInvitation` surface (Join / Open); remove inbox-monitor, tracker, filter,
      `SpaceInvitationsContainer`, graph node.
- [ ] `PLUGIN.mdl`, README, translations.

## Phase 3: storybook

- [ ] `Messenger/TwoUsers` two-column story with play test.

## Follow-ups

- [ ] Delete the legacy credential receive path after the TTL window.
- [ ] Shared message tile for plugin-inbox + plugin-messenger.
- [ ] Retention/pruning of the feed and `readIds`.
