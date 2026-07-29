# Feed soft fork — TASKS

Design: [DESIGN.md](./DESIGN.md). Branch `claude/feed-soft-fork-94c32e`.

## Phase 1 — feed-layer primitive

- [x] DESIGN.md: model, rejected alternatives (block-level, sidecar markers,
      `Feed.Feed` metadata, transparent resolution in `Feed.query`), API.
- [x] `Feed.PARENT_KEY` + `getParent` / `setParent` over `@meta` foreign keys.
- [x] `Feed.resolveBranch` — linear-with-cuts walk, `head` override,
      truncation on absent parent, termination on forward reference / cycle.
- [x] `Feed.append` options bag (`{ parent }`), applied to the first item.
- [x] `packages/core/echo/echo/src/Feed.test.ts` — pure unit tests.
- [x] DB-backed round-trip in `echo-client/src/feed/feed.test.ts` proving the
      parent key survives append → query → dedupe.

## Backlog

Rationale for each in DESIGN.md "Deferred".

- [ ] `Feed.branches(items)` — enumerate leaves for a "N other versions"
      affordance.
- [ ] Explicit active-branch head (likely a `Feed.Feed` field) fed to
      `resolveBranch` via `head`; enables branch switching.
- [ ] `Scope.feed(uri, { branch })` query-plan push-down so branch filtering
      precedes `limit` in the host indexer.
- [ ] Assistant chat wiring: "revert to here" affordance + `SessionLoader` /
      `AiSession.getHistory` integration. Must not be conflated with
      `Message.parentMessage` (tool-call nesting).
