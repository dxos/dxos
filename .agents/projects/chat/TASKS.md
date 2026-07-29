# First-party chat — TASKS

See DESIGN.md for scope and the feed-live-objects roadmap dependency.

## Status

Project created 2026-07-29. Architecture review of plugin-thread /
plugin-review in progress; plugin shape not yet decided.

## Next

- [ ] Review plugin-thread + plugin-review architecture and interaction;
      decide reuse vs new types/components.
- [ ] Decide relationship to the assistant Chat type.
- [ ] Define Channel/Message schema and channel ⇄ feed mapping.
- [ ] Plugin scaffold (manifest, capabilities, surfaces).
- [ ] Message list + composer over `Feed.query`/`Feed.append` with
      optimistic send.
- [ ] Edit/delete/react via live feed objects.
- [ ] Notifications via subscription triggers.
- [ ] Ephemeral presence/typing channel (EDGE messaging, not feeds).

## Deferred (feed-roadmap-gated)

- Read receipts / unread counts (feed phase 2 cursors).
- Push latency (feed phase 2 EDGE subscriptions).
- History beyond device capacity (feed phases 3–4).
