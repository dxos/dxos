# plugin-feed: Post storage and authority

## Problem

`Subscription.Post` objects leak into `space.db` and show up in `plugin-explorer` queries.

Posts are intended to be feed entries — append-only items in an ECHO Feed (queue) backing a `Subscription.Subscription`. They should be addressable by Queue DXN and not by any space-db query. In practice, every Post that gets curated into a `Magazine` is silently materialized into `space.db` by `curate-magazine.ts` (`reuseOrAdd` → `db.add(post)`). Once there, it is queryable like any other ECHO object.

## Root cause

The leak comes from `EchoHandler.createRef` in `@dxos/echo-db`. When a property setter receives a `Ref.make(queuePost)` value, `createRef` reads `target[symbolInternals].database` on the source proxy. Queue-decoded proxies have a hidden `SelfDXNId` carrying a Queue DXN but no `symbolInternals.database`. The default path therefore wraps the queue object as a fresh ECHO proxy and calls `database.add()` to give it a home — synthesising an ECHO DXN and persisting the Post into `space.db`.

The `reuseOrAdd` workaround in `curate-magazine.ts` was added to suppress a downstream `addCore` invariant (a second curate on the same Post produced a fresh `ObjectCore` for an id `space.db` already held), not to fix the leak itself. It papered over the symptom.

## Fix

### Layer A — `createRef` honours Queue DXN (landed)

`echo-handler.ts:createRef` now short-circuits when the source proxy carries a Queue-kind `SelfDXNId`: it returns that DXN verbatim and skips `database.add`. The existing `createRefResolver` QUEUE+objectId branch in `hypergraph.ts` already handles resolution. Test: `feed.test.ts` — "Ref.make on a feed item stores a Queue DXN and does not leak into space.db".

This unblocks `Magazine.posts: Array(Ref(Post))` pointing at queue items without leaking. It is necessary for the rest of the design but not sufficient — `curate-magazine.ts` still calls `db.add` because Posts are mutated post-creation (`snippet`, `imageUrl`, `readAt`, `tags`, etc.) and the queue API has no per-item update.

### Layer B — Post immutability and auxiliary metadata

Posts are immutable feed entries. All post-creation mutation moves to side maps keyed by Post id, on whichever object owns the relevant authority.

`Subscription.Post` collapses to feed-entry fields only:

```typescript
type Post = {
  source: Ref<Subscription>;
  title?: string;
  link?: string;
  description?: string;
  author?: string;
  published?: string;
  guid?: string;
};
```

No `snippet`, `imageUrl`, `content`, `readAt`, `tags`, `rank`, `archived` on the Post itself.

### Auxiliary metadata, by authority

| Field                                | Authority                                                         | Storage                                                                                                |
| ------------------------------------ | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `content`                            | Subscription (feed-authoritative; one fetch serves all magazines) | `Subscription.postContent: Record<id, { content, fetchedAt }>`                                         |
| `snippet`, `imageUrl`                | Magazine (curation-time derived)                                  | `Magazine.postCuration: Record<id, { snippet, imageUrl }>` — or recompute from `description` on render |
| `readAt`, `archived`, `rank`, `tags` | Magazine (per-magazine user state)                                | `Magazine.postState: Record<id, { readAt, archived, rank, tags }>`                                     |
| star                                 | Space (cross-feed, cross-magazine)                                | `StarredPosts.starred: Record<dxn, { starredAt }>` keyed by Post DXN                                   |

### Design alternatives considered

**Append-new-Post for `content`.** Considered keeping content on the Post by appending a replacement Post (new id, same guid) on fetch. Rejected: invalidates every existing `Ref(Post)` (refs point at queue ids, not guids), forces consumers to dedupe by guid on every read, and requires queue support for "supersedes." A side map on Subscription is simpler and bounded by the existing `keep` policy (drop entries when the corresponding Post is pruned from the feed).

**Recompute `snippet` / `imageUrl` on render.** Both are pure functions of `description`. If render cost is acceptable, persistence can be skipped entirely. Persisted only as an optimisation; default to recomputing.

**Demote star to magazine-scoped.** Considered putting star in `Magazine.postState[id].tags`. Rejected: today's STAR_TAG comment treats star as a property of the Post (cross-magazine). Space-level `StarredPosts` preserves that semantic and generalises to other cross-magazine state (history, read-later, etc.) if those ever appear.

### Resulting invariants

- A `Subscription.Post` exists in exactly one place: the queue backing its Subscription's Feed.
- No path inside `plugin-feed` calls `db.add(post)`. `curate-magazine.ts` no longer needs `reuseOrAdd`.
- `Magazine.posts: Array(Ref(Post))` holds Queue DXNs. Resolution goes through `createRefResolver`'s QUEUE+objectId branch.
- `db.query(Filter.type(Subscription.Post))` returns nothing — Posts are unreachable from space-db queries, which is the property `plugin-explorer` was failing.
- Refs to pruned Posts return `undefined` on resolution. The UI filters unresolved refs (a separate concern; today's `reuseOrAdd` shim made Posts immortal so this case did not arise).

## Migration

Layer A is backwards-compatible — it changes nothing for existing ECHO refs and only short-circuits when the source carries a Queue DXN. Layer B is a schema change to `Subscription.Subscription` and `Magazine.Magazine`. Existing curated data lives as standalone Posts in `space.db`; on first read a migration step should:

1. For each Magazine, walk `posts: Array(Ref(Post))`.
2. For each Post in `space.db`, find the originating Subscription via `post.source` and the original queue item (matched by `guid`).
3. Rewrite the Magazine's ref to the queue Post's DXN. Move `snippet`/`imageUrl` to `Magazine.postCuration`. Move `readAt`/`archived`/`rank`/`tags` to `Magazine.postState`. Move star to `StarredPosts`.
4. Delete the space-db Post.

Migration can run lazily per magazine open. Until it runs, the old space-db Posts continue to work because the Magazine still holds ECHO refs to them.
