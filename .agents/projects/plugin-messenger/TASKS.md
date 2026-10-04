# plugin-messenger — Tasks

Design: [`agents/superpowers/specs/2026-10-04-plugin-messenger-design.md`](../../../agents/superpowers/specs/2026-10-04-plugin-messenger-design.md).

## Phase 0: design

- [x] Explore invitation relay, plugin-inbox tiles, deck companions, multi-client stories.
- [x] Decisions 1–7 agreed (signed envelope, accept old-client loss window, default-space feed,
      contacts-only senders, deck badge, copy tile now, project registered);
      8: invitations stored as messages, envelope migration in Phase 1, toast on materialization.
- [ ] Spec reviewed by the user.

## Shipping

Stacked PRs: Phase 1 (this branch) → Phase 2 (child branch, `gh stack link`), landed together —
Phase 1 alone leaves invitations unannounced. Phase 3 follows.

## Phase 1: transport + invitations as messages

- [x] `@dxos/credentials` `inbox-envelope.ts`: create/verify, device chain, id, size check + tests.
- [x] `InboxServiceImpl.#pull` dispatch; unknown types left pending; tests.
- [x] `HaloInbox.messages` / `sendMessage` in client proxy.
- [x] `InboxService` message-only: `send`/`Notices` replaced; legacy credential → invitation message.
- [x] `SpaceInvitationMessage` (in `@dxos/types`, since client-services builds it for legacy notices; role token
      `AppSurface.SpaceInvitation` in app-toolkit); plugin-space sends via `sendMessage`.
- [x] plugin-client: `spaceInvitation` surface (Join / Open); remove inbox-monitor, tracker, filter,
      `SpaceInvitationsContainer`, graph node.
- [x] Lift `MemoryEdgeInbox` to `@dxos/client-services/testing`; inject into local services.

## Phase 2: plugin-messenger

- [ ] Package skeleton (private), registered in `plugin-defs.core.tsx`.
- [ ] `Notifications` container + feed in default space.
- [ ] `InboxMaterializer` (contact filter, meta-key dedupe, ack after write, invitation toast) + tests.
- [ ] `MessengerCapabilities.Sender` + `MessengerOperation.Send`.
- [ ] plugin-deck companion `badge`.
- [ ] Deck companion, `NotificationsPanel`, `NotificationTile`, filters.
- [ ] `PLUGIN.mdl`, README, translations.

## Phase 3: storybook

- [ ] `Messenger/TwoUsers` two-column story with play test.

## Follow-ups

- [ ] Delete the legacy credential receive path after the TTL window.
- [ ] Changeset for Phase 1 when the PR is opened.
- [ ] Shared message tile for plugin-inbox + plugin-messenger.
- [ ] Retention/pruning of the feed and `readIds`.
