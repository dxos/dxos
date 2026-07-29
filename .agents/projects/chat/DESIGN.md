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

## Open design questions

- Relationship to plugin-thread (Thread/Message types, react-ui-thread
  primitives) and plugin-review's comment integration — reuse vs parallel
  types. (Under review — this session.)
- Relationship to the assistant/projects Chat type (AI chats) — shared
  message schema? shared surfaces?
- Ephemeral presence/typing channel over EDGE messaging — explicitly NOT
  feed blocks; needs its own small primitive.
- Channel ⇄ feed mapping: one feed per channel in the space's `data`
  namespace; Channel object in the space db holding the feed ref + metadata.

## Plugin shape

TBD — pending the plugin-thread/plugin-review architecture review.
