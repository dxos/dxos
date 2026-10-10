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
- Unread count and the panel's containers come from `MessengerCapabilities.NotificationsContainers`, an
  atom the materializer module contributes once the default space is ready.
- Concurrent first writes from two devices can create two containers. They converge
  (`Notifications.converge`, run on every materializer pass and whenever the container set changes):
  the lowest id wins; the losers' messages are moved (copied, then removed from the loser) into its
  feed, skipping any whose envelope key it already holds, their read keys are merged, and the losers
  are deleted. Deleted containers are still scanned, so a write from a device that had not yet seen
  the deletion is moved too. Until then the panel, badge and envelope dedupe read every container.
- Read state is `readKeys` (envelope id, else message id), not message ids: copies made concurrently
  by two devices share a key, so read state needs no remapping, and merging is an append rather than an
  array replacement (concurrent replacements lost read state under test). A second copy of one message
  in the winning feed is dropped by the next convergence and hidden by `Notifications.view` meanwhile.
- The `Messenger/Invitation` story runs the real plugins per client (`withMultiClientProvider({ wrapper })`
  - plugin-client's `ClientPluginManager`): `SpaceOperation.AddMembers`, the `spaceInvitation` surface and
    `JoinBySpaceKey`. `TwoUsers` stays on story-local wiring because its link assertion needs an
    observable open, and the storybook layout's `LayoutOperation.Open` is a no-op.
- Links in inbox messages are encoded absolute (`Message.encodeJson`); `loadLink` opens the linked
  space if it is inactive before loading the ref.
- The panel's per-space filter is deferred (all / unread / invitations only).
- `TwoUsers` composes the components and `startInboxMaterializer` per client directly (no plugin
  manager per client); Bob stores notifications in a space of his own, and the deck badge is mirrored
  by a story-local pill.

## Follow-ups

- [ ] Per-space filter in the panel (by the linked object's space).
- [ ] QA demo recording of `QA-1` against the running app (autocue).
- [x] Verify a linked object resolves on the recipient: refs were encoded relative (`echo:///<id>`)
      and resolved against Bob's own space; now absolute, asserted by the `TwoUsers` play test.
- [ ] Delete the legacy credential receive path after the TTL window.
- [x] Changeset for Phase 1 when the PR is opened.
- [ ] Shared message tile for plugin-inbox + plugin-messenger.
- [ ] Retention/pruning of the feed and `readKeys`.
- [x] Surface inbox failures for identities without an account (EDGE 403
      `identity_not_associated_with_account`): `InboxAccountRequiredError` from `sendMessage`,
      `HaloInbox.status` (published on the transition only), `AddMembers.notNotified` + "Added, but not
      notified" toast with Copy link, messenger panel empty state explains it.
- [ ] Show the account-required notice in the panel even when older notifications are listed (today it
      replaces the empty state only).
