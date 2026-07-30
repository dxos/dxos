# Feed soft fork — TASKS

Design: [DESIGN.md](./DESIGN.md). Branch `claude/feed-soft-fork-94c32e`. PR
[#12387](https://github.com/dxos/dxos/pull/12387) (preview
`pr-12387-composer-main.dxos.workers.dev`).

## Phase 1 — feed-layer primitive

- [x] DESIGN.md: model, rejected alternatives (block-level, sidecar markers,
      `Feed.Feed` metadata, transparent resolution in `Feed.query`), API.
- [x] `Feed.PARENT_KEY` + `getParent` / `setParent` over `@meta` foreign keys.
- [x] `Feed.history` — linear-with-cuts walk, `head` override,
      truncation on absent parent, termination on forward reference / cycle.
- [x] `Feed.append` options bag (`{ parent }`), applied to the first item.
- [x] `packages/core/echo/echo/src/Feed.test.ts` — pure unit tests.
- [x] DB-backed round-trip in `echo-client/src/feed/feed.test.ts` proving the
      parent key survives append → query → dedupe.

## Phase 2 — `Feed.Reset` replaces the pending-fork field

Landed after PR [#12387](https://github.com/dxos/dxos/pull/12387) merged.

- [x] `Feed.Reset` + `makeReset` / `isReset` — a fork marker carrying lineage
      only, so the writer that follows needs no fork protocol.
- [x] Parentless reset means "resume from nothing"; the walk stops without
      reporting `shallow`. Sound only because a reset is its own type.
- [x] Removed `Feed.rewindFrom` — a single mutable cell on replicated state that
      concurrent forks clobber, ordered independently of the items it described,
      and durable for a rewind the user was still composing.
- [x] `AiSession.appendTurnMessage` is a plain append again; the walk includes
      resets, `reifyHistory` stays message-only (a contentless message would be
      rejected by providers).
- [x] Pending rewind is client-local React state; the reset is appended at submit.
- [x] Tests: reset semantics in `Feed.test.ts` (incl. the negative control that
      an ordinary parentless item still continues from its predecessor), DB-backed
      in `assistant-toolkit/Chat.test.ts`, session in `AiSession.test.ts`,
      projection + `resolveForkParent` in `Chat/thread.test.ts`, end-to-end in the
      `ChatArticle` `Rewind` story.

## Backlog

Rationale for each in DESIGN.md "Deferred".

- [ ] `Feed.branches(items)` — enumerate leaves for a "N other versions"
      affordance. Derive from lineage; do not store (DESIGN.md "Rejected: an
      array of fork points").
- [ ] Explicit active-branch head fed to `history` via `head`; enables branch
      switching. Start client-local — which branch you are viewing is view state
      until someone wants it shared across devices.
- [ ] Reflog affordance: resets record that a fork happened, and `actorId`
      records who, so "show abandoned turns" is now readable from the log.
- [ ] `Scope.feed(uri, { branch })` query-plan push-down so branch filtering
      precedes `limit` in the host indexer.
- [ ] Assistant chat wiring: "revert to here" affordance + `SessionLoader` /
      `AiSession.getHistory` integration. Must not be conflated with
      `Message.parentMessage` (tool-call nesting).
