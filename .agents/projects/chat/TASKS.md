# First-party chat — TASKS

See DESIGN.md for scope and the feed-live-objects roadmap dependency.

## Status

Project created 2026-07-29. Architecture review DONE (see DESIGN.md):
**no new plugin — build on plugin-thread's feed-backed `Channel`** (message
list + composer + optimistic send already work via `feedChannelBackend`).
Work = the gaps below.

## Next

- [x] Review plugin-thread + plugin-review architecture and interaction —
      Channel is already feed-backed with pluggable providers; review's
      comments are a separate AnchoredTo/Thread path sharing only types + UI
      primitives.
- [ ] Decide reactions schema (`Message.properties` map vs Reaction relation).
- [ ] Message actions in UI: edit (Obj.update re-append), delete
      (Feed.remove), reactions.
- [ ] In-channel threading UI over existing `parentMessage`/`threadId`.
- [ ] Notifications via subscription triggers on the channel feed.
- [ ] Ephemeral presence/typing primitive (EDGE messaging, not feeds; cf.
      plugin-calls swarm presence).
- [ ] Channel management polish: sidebar organization, membership display,
      rename/archive.
- [ ] Decide assistant Chat / Channel convergence (leaning: keep parallel).

## Deferred (feed-roadmap-gated)

- Read receipts / unread counts (feed phase 2 cursors).
- Push latency (feed phase 2 EDGE subscriptions).
- History beyond device capacity (feed phases 3–4).
