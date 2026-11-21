# plugin-messenger — cross-space notifications inbox

Status: draft for review (2026-10-04). Tasks: [`.agents/projects/plugin-messenger/TASKS.md`](../../../.agents/projects/plugin-messenger/TASKS.md).

## Goal

A notifications panel (R1, toggled from an envelope button with an unread count in R0) listing
messages that span spaces: space invitations, and notices from other users and bots. It is for
**alerts that point elsewhere** — a message carries a short text plus links to the object or surface
where the real conversation or work lives. It is not another chat channel: no threads, no replies,
no compose UI in the panel.

## Decisions

| #   | Topic        | Decision                                                                                                                                                                                                     |
| --- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Wire format  | A generic **signed inbox envelope** (not a HALO credential) carrying a JSON-encoded `Message`. Space invitations move onto it in Phase 1; the credential notice survives only as a receive-only legacy path. |
| 2   | Old clients  | Accept the loss window: a pre-envelope client cannot decode an envelope and acks it (deleting it on all devices). From this change on, `#pull` leaves unknown types/versions pending instead of acking them. |
| 3   | Storage      | A feed-backed `Notifications` container in the user's default space (`AppSpace.getDefaultSpace`), created on first use.                                                                                      |
| 4   | Who may post | Only identities in the recipient's contact book (as for invitations). A bot posts as its own identity DID and must share a space with the recipient.                                                         |
| 5   | Unread badge | plugin-deck gains an optional `badge` (count atom) on deck companions, rendered on the R0 tab trigger.                                                                                                       |
| 6   | Tile reuse   | Copy the minimal tile from plugin-inbox's `MessageTile` into plugin-messenger now; extract a shared component once both consumers have settled.                                                              |
| 7   | Tracking     | Registered as project `plugin-messenger`.                                                                                                                                                                    |
| 8   | Invitations  | Stored as messages like any other: a `Message` with a `spaceInvitation` surface block. New invitations still raise a toast, triggered by materialization. plugin-messenger becomes a core plugin.            |

### Why an envelope, not a credential

The invitation notice borrows `createCredential` only as a signing tool: it gets an end-to-end
signature, recipient binding (`subject`), a hash id and `verifyCredential`. A message is content,
not an assertion HALO or a space interprets; putting it in `credentials.proto` would pollute the
assertion registry and force a proto mirror of every `ContentBlock`. What messages need —
authenticity, recipient binding, replay/TTL bounds, dedupe — are envelope properties.

One constraint survives from the credential design: devices do not hold the identity private key.
`Identity.getIdentityCredentialSigner()` signs with the **device key** and attaches the device's
`AuthorizedDevice` chain. The envelope must do the same, so the recipient can verify
device-key ∈ sender identity. The envelope therefore reuses the existing chain type and chain
verification from `@dxos/credentials`; it only replaces the assertion wrapper.

## Architecture

```
 sender plugin ──► MessengerCapabilities.Sender ──► client.halo.inbox.sendMessage
                        (or MessengerOperation.Send)          │ sign envelope (device key + chain)
                                                              ▼
                                                 EDGE  POST /inbox/:recipientDid   (opaque payload)
                                                              │ push doorbell
                                                              ▼
 recipient: InboxServiceImpl.#pull ── verify, dispatch on type ──► halo.inbox.messages
                                                              │
 plugin-messenger: InboxMaterializer ── contact filter, dedupe ──► Message in Notifications feed
                                                              │ ack after write
                                                              ▼
                             NotificationsPanel (R1)  +  envelope tab with unread badge (R0)
```

### 1. Envelope (`@dxos/credentials`, new `inbox-envelope.ts`)

- Header: `{ version: 1, type: string, sender: identityKey, recipient: identityKey, sentAt }`.
  `type` is a reverse-DNS string; this change defines `org.dxos.inbox.message` (payload = a
  `Message` encoded with its Effect Schema).
- Signature: device key over the canonical bytes of header + payload; the device's
  `AuthorizedDevice` credential chain travels with it.
- `createInboxEnvelope(signer, recipient, { type, payload })` /
  `verifyInboxEnvelope(envelope, { self, claimedSender, now, ttlMs })`. Verification failures mirror
  the notice's: `malformed | invalid-signature | forged-issuer | wrong-subject | expired | future`.
- Id: hex digest of the signed bytes, recomputed by the recipient — the dedupe key.
- Size: the base64 envelope must fit EDGE's `INBOX_MAX_PAYLOAD_LENGTH` (16 KiB). `sendMessage`
  rejects oversized messages before calling EDGE. Notifications should be well under this; large
  content belongs in the linked object, not the message.

Payload is signed, not encrypted — the same phase-1 posture as invitations (see
`2026-09-24-space-invite-relay-design.md`, decision 1).

### 2. Client protocol and service (`@dxos/protocols`, `@dxos/client-services`, `@dxos/client`)

- `InboxService` becomes message-only:
  - `send` (invitation-specific) is **replaced** by `sendMessage { recipientIdentityKey, type, payload }`.
  - `Notices` is replaced by `Messages { messages: InboxMessage[] }`, where
    `InboxMessage = { id, senderIdentityKey, type, payload, sentAt }`. It is still emitted whole,
    so an ack on another device removes the entry here too.
  - `ack` is unchanged.
- `InboxServiceImpl.#pull`: decode the payload as an envelope first, then as a credential.
  - Envelope with a known version → verify; failures are acked (they can never become valid).
  - Envelope with an unknown version or type → **left pending, not acked** (decision 2).
  - **Legacy credential** (`SpaceInvitationNotice` from a pre-envelope sender) → verified as today,
    then converted into an `InboxMessage` whose payload is the same invitation `Message` a new sender
    would build. This is receive-only; nothing sends credentials any more. Delete it once the
    14-day TTL has passed for every sender on a release that predates this change.
  - Undecodable as either → acked, as today.
- `HaloInbox`: `messages: MulticastObservable<readonly InboxMessage[]>`, `sendMessage(request)` and
  `ack(ids)`. `notices` and `send` are removed.

### 2b. Space invitations as messages (`@dxos/app-toolkit`, plugin-space, plugin-client)

- `@dxos/app-toolkit` gains `SpaceInvitationMessage`:
  - `SPACE_INVITATION_ROLE = 'org.dxos.role.spaceInvitation'`;
  - `make({ sender, spaceKey, role, spaceName? })` builds a `Message` with a
    `ContentBlock.Surface { role, data: { spaceKey, role } }` and a text fallback. It uses a
    surface rather than an attachment `ref` because the recipient has no object to resolve until
    they join;
  - `match(message)` reads it back.
- plugin-space `sendInvitationNotices` builds that message and calls `halo.inbox.sendMessage`.
  Admission (`admitContact`) is unchanged and stays the actual grant; the message is only a pointer.
- plugin-client contributes the `spaceInvitation` surface: inviter, space name and **Join**
  (existing `joinSpaceInvitation` → `SpaceInvitationOperation.JoinBySpaceKey`). Joined-ness is
  computed live from `client.spaces`; once joined, the tile shows **Open space** instead. No stored
  state needs to be kept in sync.
- plugin-client **removes** `inbox-monitor` (toast), `SpaceInvitationTracker`,
  `filterSpaceInvitations`, `SpaceInvitationsContainer` and the invitations graph node. The panel and
  the materializer replace them. Joining no longer acks; the materializer acked on write.

### 3. plugin-messenger (`packages/plugins/plugin-messenger`, private)

Modelled on plugin-progress (layout, capability modules) and plugin-sample (deck companion,
`PLUGIN.mdl`). It is registered in `plugin-defs.core.tsx`: invitations now depend on its
materializer, so it cannot be optional.

- **Types**
  - `Notifications` container: `{ feed: Ref<Feed>, readIds: string[] }`, one per default space,
    hidden from the navtree. Messages live in the feed; `readIds` holds ids of read messages still
    in the feed.
  - Message conventions: `sender.identityDid` set from the verified sender. Links to the target go
    in `attachments[].ref` (`ContentBlock.Reference` is deprecated). Subject in
    `properties.subject`. The envelope id is stored as an ECHO meta key
    `{ source: 'org.dxos.inbox', id }`, so two devices materializing the same envelope dedupe.
- **`InboxMaterializer`** (startup capability): subscribes to `client.halo.inbox.messages`.
  - Drops senders not in `client.halo.contacts`, leaving them pending (a sender who becomes a contact
    later is then shown).
  - Decodes the payload with the `Message` schema; undecodable payloads are acked and dropped.
  - Writes to the feed unless the meta key already exists, **then** acks. A crash between write and
    ack re-delivers, and the meta key absorbs the duplicate.
  - Raises a toast for each newly written invitation message, with a Join action; this replaces
    plugin-client's `inbox-monitor`. Other messages only move the badge. The toast fires only on
    the device that wrote the message. Another device that receives the message by replication
    does not toast, so one invitation is never announced twice.
- **`MessengerCapabilities.Sender`** — `{ send(recipientDid, message): Effect<void, InboxSendError> }`.
  It is the capability other plugins consume. `MessengerOperation.Send` wraps it so agents and bots
  can post through operations.
- **UI**
  - Deck companion `messenger` (`AppNode.makeDeckCompanion`, icon `ph--envelope--regular`), whose
    `badge` is the unread count: feed messages not in `readIds`.
  - `NotificationsPanel` is a `Panel` with a toolbar filter (all / unread / invitations / per-space
    via the linked object's space) over `Mosaic.VirtualStack` of `NotificationTile`.
  - Clicking a tile marks it read and navigates to the first attachment. The tile menu offers mark
    unread and delete.

### 4. plugin-deck badge

- Optional `badge?: Atom<number | undefined>` on the deck-companion node data.
- The `Tabs.Trigger` in `ComplementarySidebar` renders a small count pill when the badge is > 0.
- No other deck behaviour changes.

### 5. Two-column storybook

- Move `MemoryEdgeInbox` out of `inbox-service.test.ts` into `@dxos/client-services/testing`.
  It is one in-memory relay routed by recipient DID and shared by every client in the story.
- Let `withMultiClientProvider` / the local services stack accept it, so `InboxServiceLayer` gets
  an edge client in tests. This is the only change needed to run the inbox without EDGE.
- Story `Messenger/TwoUsers`, built with `withMultiClientProvider({ numClients: 2, createSpace: true })`.
  Sharing the space makes A and B contacts.
  - Left column: user A with a contact picker and a minimal compose form (text + optional link to
    an object in the shared space), calling `MessengerCapabilities.Sender`.
  - Right column: user B's `NotificationsPanel` with its badge.
  - A `play` step sends, waits for the tile on B, clicks it, and asserts the badge clears.

## Shipping

One PR (#13701) carrying all three phases: transport and invitations, plugin-messenger with the
deck badge, and the two-user storybook. Phase 1 alone would leave invitations unannounced.

## Testing

- `inbox-envelope.test.ts`: round trip; tampered payload; wrong recipient; device key not in the
  chain; forged issuer vs `claimedSender`; expired; future-dated.
- `inbox-service.test.ts`: an envelope is surfaced as a message; a legacy invitation credential is
  surfaced as an invitation message; an unknown type is left pending and not acked; a failing
  envelope is acked.
- `client-e2e` contact-book test: an invite delivered through the envelope; the recipient joins via
  the surface's operation.
- plugin-messenger: materializer dedupe (two "devices" over one space), contact filter, ack only after
  write; capability send → recipient feed (node, two `TestBuilder` clients plus the shared fake relay).
- Storybook play test for the two-column story.

## Out of scope / follow-ups

- Deleting the legacy credential receive path after the TTL window.
- Encryption to a per-identity key (shared invite-relay follow-up).
- Extracting a shared message tile used by both plugin-inbox and plugin-messenger.
- Bot volume: EDGE allows 50 sends per sender per day across all recipients and holds 100 pending
  per recipient. That fits alerts but caps a bot that notifies many users; raising it is an
  edge-repo change, deferred until a real bot needs it.
- Retention: pruning old feed entries and their `readIds`.

## Risks

- **Old-client loss window** (decision 2). A recipient with any pre-envelope device may lose
  messages until all of their devices update. This is acceptable for notifications, which point at
  durable objects elsewhere.
- **Invitations to old-client recipients**: decision 2 applies to invitations too. The recipient
  is still admitted, because admission is the space credential, but an old client never hears about
  it. The inviter can still share a link, and the recipient sees the space once any of their
  devices updates. Accepted.
- **Deck API surface**: the badge is a public `DeckCompanion` addition other plugins may adopt.
