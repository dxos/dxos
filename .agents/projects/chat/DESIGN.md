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

**Ship gate:** prototype freely on the landed #12235 surface, but feed
phase 1 (version/order axis) should land before chat ships to real users —
v1 live objects lean on `KEY_QUEUE_POSITION`, which is null unless
`assignQueuePositions` is on (default-off ordering guarantee).

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

## Direction (2026-07-29, second pass — jdw)

Three decisions extending the review above:

1. **Rename `plugin-thread` → `plugin-chat`** (plugin id
   `org.dxos.plugin.thread` → `org.dxos.plugin.chat`). Mechanical, own PR, all
   call sites updated in the same change — no compatibility shims (repo rule).
   Blast radius includes the shared `threadTranslations` imported by
   plugin-review.
2. **Threads become feed-backed — via the shared-feed model, not
   feed-per-thread.** A `Thread` becomes metadata (name/status/agent) plus a
   view over `(feed, threadId)`; `Message.threadId`/`parentMessage` already
   exist. Feed-per-thread is rejected: it would mint hundreds of tiny feeds
   against the ~1000 feeds/space budget.
   - **Channel threads share the channel's feed** (Zulip's `(channel, topic)`
     pair): one ordering, one sync stream, one future read cursor; main view
     renders roots (`threadId == null`) with thread summaries; thread view
     filters by `threadId`; Thread metadata object created lazily on first
     reply.
   - **Review comments move to a per-subject comments feed** (one per
     document). `AnchoredTo` anchoring unchanged; only message storage moves
     off the `thread.messages` ref-array. Per-subject beats one space-wide
     comments feed on partial replication (replicate comment feeds only for
     documents you open). Caveat: feeds/space budget now counts
     documents-with-comments + channels; phase-3 epochs cover growth.
3. **Thread-first channels** (Zulip/Roomy inspiration): any message can start
   a thread; main-feed messages are primarily branching-off points — guided,
   not forced. Mostly presentation: replies default into threads; the main
   composer remains.

Sequencing: rename → thread-over-feed model (Thread schema drops the messages
ref-array; migration story TBD) → review port → thread-first UX.

Coordination flags: `document-revisions` (burdon) is active in plugin-review —
steps 2–3 must sequence with it. Per-thread unread granularity is finer than
the per-feed cursor feed-phase-2 defines — needs per-thread high-water marks
or channel-level granularity initially.

## Direction (third pass — sequencing + Channel-absorbs-Thread refinements)

**Model refinement (agreed):** no separate `Thread` object at all. Channel is
the one conversation type; a thread is a `threadId` partition of the channel
feed; review comments are a per-document comments Channel.

- **Sequencing:** (1) prototype ALL new chat behavior in `plugin-thread`
  first — thread-first channels, message actions, threading UI — against the
  existing `Channel` type (already in `@dxos/types`, nothing to lift);
  (2) once the model is proven, rename the plugin to `plugin-chat` and land;
  (3) review-comments unification (replacing Thread) comes afterwards as its
  own effort.
- **Nav hygiene = the companion-chat pattern:** a Channel with a relation to a
  document is excluded from the navtree custom section (same treatment as
  assistant companion chats). No new mechanism.
- **Anchoring: `threadId = anchor`.** In review channels there are no
  per-thread `AnchoredTo` relations — the stable cursor-range anchor id IS the
  thread id; sidebar placement and ordering derive from anchor position in the
  document. Consequences to design deliberately:
  - Per-thread resolved status needs a home (leading candidate: root-message
    `properties`).
  - Identical range → same thread (comments on the same selection join up) —
    confirm as intended behavior.
  - Deleted anchor text → orphaned thread (existing review behavior,
    unchanged).
- `Thread` (`org.dxos.type.thread`) is deleted in step 3 with a migration
  (ref-array messages → feed messages); sequence explicitly with
  document-revisions (burdon).

## Appendix: external chat integration (long-term)

`ChannelBackendProvider` is the interim pluggability layer, not the end-state.
The proper way to integrate an external chat system (Matrix, etc.) natively
into Composer is one level down: **keep every Channel on the default feed
provider, and back the _feed itself_ with a different `FeedBackend`** — the
feed-as-read-through-cache model (replicated live tail + evictable cached
history ranges + watermarked paging; see feed-live-objects DESIGN.md,
"Pluggable feed backend" companion workstream). The external system then
inherits the full native experience for free — offline send via the outbox,
optimistic updates, live objects, caching, and (post-phase-2) read state —
while the chat plugin remains completely unaware of the backend.

When that lands, `ChannelBackendProvider` should be retired (or reduced to a
thin channel-creation/config concern): swapping `subscribe`/`send` at the
plugin layer loses everything the feed pipeline provides and would duplicate
it per provider. Until then it remains the cheap seam for shallow or read-only
integrations. Long-term; not scheduled in the stages above.

## Principle: feed items are single-writer

Feeds have no merge semantics — conflict mode is last-flush-wins at
whole-object granularity (#12235). Therefore no shared mutable state on feed
items: anything multiple participants affect is expressed as **separate
per-author immutable items folded at read time**. (Matrix models reactions the
same way: `m.reaction` is its own event referencing the target.)

- **Reactions (decided):** `Reaction` is its own data type appended to the
  channel feed — `{ target: Ref<Message>, emoji, sender }` — NOT a property on
  the Message (concurrent LWW clobbering) and NOT a Relation (relations relate
  objects; this is a datum referencing a message). Render by folding reactions
  per target; un-react = tombstone your own reaction item.
- **Replies:** same pattern from the other side — `Message.parentMessage`
  (already in the schema) refs the prior message within a thread; reference,
  never mutation.
- Message _edits_ remain author-only re-appends, which single-writer makes
  safe.

## Remaining open questions

- Assistant `Chat` / `Channel` convergence: same storage idiom, different
  types — unify on Channel with an agent-backend, or keep parallel and share
  only Message + UI primitives? (Leaning: keep parallel for now; converge
  only if the assistant needs channel features.)
- Whether `readOnly`-via-foreign-keys is the right long-term signal for
  bridged channels once `FeedBackend` integrations exist.
