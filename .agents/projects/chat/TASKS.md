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
- [ ] **Stage 1 — prototype chat in plugin-thread** (Channel already in
      @dxos/types): thread-first UX (roots + thread summaries in main view,
      reply-into-thread default, thread view filtered by threadId; thread
      topic = root-message property), message actions, threading UI.
- [ ] **Stage 2 — rename plugin-thread → plugin-chat** once the model is
      proven (own PR; plugin id, package, call sites, shared translations —
      no shims).
- [ ] **Stage 3 — review unification**: per-document comments Channel
      (companion-chat nav-hiding via relation to the document);
      `threadId = anchor`; delete Thread type with migration (coordinate
      with document-revisions). Decide: resolved-status home (root-message
      properties), identical-anchor join semantics, orphaned anchors.
- [x] Decide reactions schema — `Reaction` object type appended to the feed
      (`target: Ref<Message>`, emoji, sender); per-author immutable items,
      folded at read; un-react = tombstone own item. See DESIGN.md
      "Principle: feed items are single-writer".
- [ ] Message actions in UI: edit (Obj.update re-append), delete
      (Feed.remove), reactions (fold Reaction items per target).
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
