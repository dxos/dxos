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
- [ ] **Rename plugin-thread → plugin-chat** (own PR; plugin id, package,
      call sites, shared translations — no shims).
- [ ] **Thread-over-feed model**: Thread = metadata + view over
      `(feed, threadId)`; drop the `messages` ref-array (schema bump);
      channel threads share the channel feed; decide migration story for
      existing Thread data.
- [ ] **Port plugin-review** to feed-backed threads: per-subject comments
      feed; AnchoredTo unchanged (coordinate with document-revisions).
- [ ] **Thread-first channel UX**: roots + thread summaries in main view,
      reply-into-thread default, thread view filtered by threadId.
- [ ] Decide reactions schema (`Message.properties` map vs Reaction relation).
- [ ] Message actions in UI: edit (Obj.update re-append), delete
      (Feed.remove), reactions.
- [ ] Notifications via subscription triggers on the channel feed.
- [ ] Ephemeral presence/typing primitive (EDGE messaging, not feeds; cf.
      plugin-calls swarm presence).
- [ ] Channel management polish: sidebar organization, membership display,
      rename/archive.
- [ ] Decide assistant Chat / Channel convergence (leaning: keep parallel).
- [ ] Per-thread read-state granularity (vs per-feed phase-2 cursor).

## Deferred (feed-roadmap-gated)

- Read receipts / unread counts (feed phase 2 cursors).
- Push latency (feed phase 2 EDGE subscriptions).
- History beyond device capacity (feed phases 3–4).
