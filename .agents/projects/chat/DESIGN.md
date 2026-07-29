# First-party chat — DESIGN

Small-scale, native channels on feeds (the Bluesky-DM strategy: ship the
unambitious first-party thing on infrastructure we own; defer federation).
Decided 2026-07-29 in the feeds/event-sourcing exploration — see
`.agents/projects/feed-live-objects/DESIGN.md` "Roadmap" for the feed phases
this plugin consumes and the decision context (external large-scale sources
enter as processed signals via connectors; Matrix is a long-term shelf behind
the `FeedBackend` companion workstream).

## Scope

- Channels within a space, capped at what feeds support today
  (~10k blocks/feed, ~1000 feeds/space — team/community scale).
- Message edit/delete/react via live feed objects (#12235 semantics:
  re-append = update, tombstone deletes, `Obj.update`).
- Notifications via subscription triggers (`created`/`updated`/`deleted`).
- Offline send via the existing feed outbox (optimistic append,
  unpositioned-block push, `blocksToPush` as pending indicator).

Inherited later, no plugin changes expected: read receipts / unread counts
(feed phase 2 consumer cursors), EDGE push replacing 1s polling (phase 2),
device-exceeding history (phases 3–4: retention + epoch chaining, sparse
feeds with watermarked paging).

Out of scope: external chat backends (Matrix/Discord — `FeedBackend`
workstream), E2EE beyond space security, cross-space/public channels.

## Architecture review (2026-07-29)

**The chat plugin already exists in embryo: `plugin-thread`'s `Channel` is a
feed-backed channel.** Key facts, verified in source:

- `Channel` (`org.dxos.type.channel` v0.2.0, `sdk/types/src/types/Channel.ts`)
  has a **pluggable backend**: `backend.kind` discriminator + provider-owned
  config ref; `Channel.make()` defaults to a local `Feed`. The doc comment
  already anticipates external providers ("e.g. the local feed, an ATProto
  channel").
- The default provider (`plugin-thread/src/capabilities/channel-backend-feed.ts`)
  reads via a reactive feed-scoped query
  (`db.query(Query.select(Filter.type(Message.Message)).from(feed))`) — which
  post-#12235 yields **live** message objects — and writes via `Feed.append`.
  Providers implement `ChannelBackendProvider`
  (`kind`/`makeConfig`/`subscribe`/`send`/`readOnly`); `readOnly` already keys
  off foreign keys (imported/bridged channels render read-only).
- `Message` (`org.dxos.type.message`) is shared across the repo: sender Actor,
  `blocks: ContentBlock[]`, and — already present — `parentMessage`/`threadId`
  for in-channel threading.
- **plugin-review does not interact with channels.** Comments are `Thread`
  objects (messages held in an ECHO ref-array, direct mutation, no feed)
  attached to subjects via the `AnchoredTo` relation; review and thread share
  only the `@dxos/types` schemas and the `@dxos/react-ui-thread` primitives
  (`Thread.*`, `Message.Tile`) — zero cross-imports between the plugins.
- Two more feed-backed conversation types already follow the Channel pattern:
  assistant `Chat` (`org.dxos.type.assistant.chat`: `feed` ref + instructions/
  plan) and inbox `Mailbox` (`feed` ref + tag index). Three types, one storage
  idiom, one shared Message schema.

**Backend pluggability exists at two layers** — keep them distinct:

- `ChannelBackendProvider` (plugin-level, exists): swap where `subscribe`/
  `send` go. A shallow external integration (e.g. read-only ATProto channel)
  enters here without touching sync.
- `FeedBackend` (sync-level, companion workstream in feed-live-objects): swap
  what answers the feed protocol. A deep integration (Matrix with offline
  send, caching, live objects) enters here and the feed provider above stays
  unchanged.

## Plugin shape (decision)

**No new plugin. First-party chat = hardening and extending `plugin-thread`'s
Channel path.** Work is the gap between Channel today and the decided scope:

1. **Message actions** — edit (live-object `Obj.update` → re-append),
   delete (`Feed.remove` tombstones), reactions (schema decision: `properties`
   map vs a small relation type) wired into `MessageThread`/`react-ui-thread`
   UI.
2. **In-channel threading** — `Message.parentMessage`/`threadId` exist in the
   schema; needs UI (reply affordance, thread view).
3. **Notifications** — subscription-trigger wiring
   (`created` on the channel feed → notification), gated on runnable/trigger
   UX.
4. **Presence/typing** — ephemeral EDGE-messaging primitive, explicitly not
   feed blocks; nearest prior art is plugin-calls' swarm presence (already
   integrated into `ChannelArticle` for calls).
5. **Channel management polish** — creation flow exists (`CreateChannel`
   operation); needs sidebar organization, membership display (= space
   membership), rename/archive.

Deferred to feed phases (no plugin work): unread/read-state (phase 2 cursors),
push latency (phase 2), history beyond device (phases 3–4).

## Remaining open questions

- Reactions schema: `Message.properties` LWW map vs `Reaction` relation
  objects appended to the feed (relation survives edit-re-appends better).
- Assistant `Chat` / `Channel` convergence: same storage idiom, different
  types — unify on Channel with an agent-backend, or keep parallel and share
  only Message + UI primitives? (Leaning: keep parallel for now; converge
  only if the assistant needs channel features.)
- Whether `readOnly`-via-foreign-keys is the right long-term signal for
  bridged channels once `FeedBackend` integrations exist.
