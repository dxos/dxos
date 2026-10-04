# plugin-messenger — Tasks

Design: [`agents/superpowers/specs/2026-10-04-plugin-messenger-design.md`](../../../agents/superpowers/specs/2026-10-04-plugin-messenger-design.md).

## Phase 0: design

- [x] Explore invitation relay, plugin-inbox tiles, deck companions, multi-client stories.
- [x] Decisions 1–7 agreed (signed envelope, accept old-client loss window, default-space feed,
      contacts-only senders, deck badge, copy tile now, project registered);
      8: invitations stored as messages, envelope migration in Phase 1, toast on materialization.
- [ ] Spec reviewed by the user.

## Shipping

One PR (#13701) on this branch: Phases 1–3 together (stack dropped 2026-10-04).

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

- [x] Package skeleton (private), registered in `plugin-defs.core.tsx`.
- [x] `Notifications` container + feed in default space.
- [x] `InboxMaterializer` (contact filter, meta-key dedupe, ack after write, invitation toast) + tests.
- [x] `MessengerCapabilities.Sender` + `MessengerOperation.Send`.
- [x] plugin-deck companion `badge`.
- [x] Deck companion, `NotificationsPanel`, `NotificationTile`, filters.
- [x] `PLUGIN.mdl`, README, translations.

## Phase 3: storybook

- [x] `Messenger/TwoUsers` two-column story with play test.

Decisions taken while building (beyond the spec):

- `badge` lives in the deck-companion node's `properties` (next to `mount`/`joyride`), not `data`,
  which is the surface subject; rendered as a `data-badge` pseudo-element because an icon-only
  `Button` renders no children.
- Unread count and the panel's container come from `MessengerCapabilities.NotificationsContainer`, an atom
  the materializer module contributes once the default space is ready.
- Concurrent first writes from two devices can create two containers; readers pick the lowest id.
- The panel's per-space filter is deferred (all / unread / invitations only).
- `TwoUsers` composes the components and `startInboxMaterializer` per client directly (no plugin
  manager per client); Bob stores notifications in a space of his own, and the deck badge is mirrored
  by a story-local pill.

## Follow-ups

- [ ] Per-space filter in the panel (by the linked object's space).
- [ ] QA demo recording of `QA-1` against the running app (autocue).
- [ ] Delete the legacy credential receive path after the TTL window.
- [x] Changeset for Phase 1 when the PR is opened.
- [ ] Shared message tile for plugin-inbox + plugin-messenger.
- [ ] Retention/pruning of the feed and `readIds`.
