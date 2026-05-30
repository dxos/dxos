# Feed + Metadata Kit — Design

Date: 2026-05-30
Status: Approved (brainstorming)
Package: `@dxos/schema` (`packages/sdk/schema`)
First adopter: `@dxos/plugin-product-search`

## Problem

Several plugins share a recurring shape: a collection of **immutable** objects paired with
**mutable per-item metadata** kept in a side-map indexed by object id. The pattern is currently
hand-rolled per plugin, with duplicated read/patch helpers and no shared primitive.

Existing instances:

- `Subscription.postState` — `Record<postId, { imageUrl?, readAt?, archived?, starred?, starredAt? }>`,
  with Posts living in `Subscription.feed` (an ECHO Feed queue). Has a `keep`-bound prune that
  preserves starred Posts.
- `Magazine.postState` — `Record<postId, { snippet?, rank? }>`, magazine-scoped. Items are a
  `Ref[]` array — **no feed**.
- `Mailbox.extracted` — `Record<messageId, string[]>`, with Messages in `Mailbox.feed`.
- `plugin-product-search` (target) — wants `Search.Result` objects stored in a feed, with `starred`
  moved off the (now immutable) Result into a side-map.

`Mailbox.tags` is **explicitly out of scope**: it is keyed by *tagId* and each value holds an array
of message Refs (an inverted tag→messages index), structurally different from per-object metadata.

## Goals

- A reusable, composable kit covering the existing per-object-metadata use cases, retrofittable onto
  them.
- Two **independent** primitives: a metadata side-map and an immutable feed collection. Neither
  depends on the other (Magazine uses the side-map with no feed).
- Convert `plugin-product-search` as the first adopter.

## Non-goals

- Modeling `Mailbox.tags` (inverted index).
- A unified "AnnotatedFeed" object that forces a feed where none exists.
- Bounded/pruned feeds for product-search (it accumulates unbounded — see below). `prune` exists in
  the kit for Subscription's benefit but product-search does not call it.

## API

The kit lives in `@dxos/schema` under `src/feed/` and is exposed as two `// @import-as-namespace`
modules.

### `Metadata` — per-item side-map (pure)

In-document `Record<objectId, S>`. All mutations go through `Obj.update`; no feed/queues required.

```ts
// @import-as-namespace  → imported as `Metadata`

// Schema fragment spliced into a host Struct. Optional record, hidden from forms.
export const field: <S>(value: Schema.Schema<S>) => /* optional Record<string, S> */;

// Bound accessor over host[key]; all mutations via Obj.update.
export interface Accessor<S> {
  get(id: string): Partial<S>;                  // {} when absent — call sites read without ?-chains
  patch(id: string, patch: Partial<S>): void;   // shallow-merge into existing entry
  remove(id: string): void;
  entries(): Array<[string, S]>;
  ids(predicate?: (state: S, id: string) => boolean): string[];
}
export const bind: <H, K extends keyof H>(host: H, key: K) => Accessor<ValueOf<H[K]>>;
```

Generalizes today's `plugin-feed/src/util/post-state.ts`
(`getSubscriptionPostState` / `updateSubscriptionPostState`).

### `FeedCollection` — immutable queue (Effect)

Helpers over an ECHO `Feed` queue. Functions declare `FeedService` as a requirement; callers provide
the layer (`createFeedServiceLayer(space.queues)`).

```ts
// @import-as-namespace  → imported as `FeedCollection`

// Identity is a pluggable key function — two items "match" iff same key. Default keys by `url`.
export type Identity<T> = (item: T) => string;

// Append only items whose identity is not already present (append-once). Returns, per input,
// the entry now representing it: the pre-existing match, or the freshly-appended object.
export const appendUnique: <T>(
  feed: Feed,
  items: T[],
  options: { identity: Identity<T> },
) => Effect.Effect<T[], never, FeedService>;

export const list: <T>(feed: Feed, filter?: Filter) => Effect.Effect<T[], never, FeedService>;

// Retain the most-recent `keep` entries; `pin`-ned entries always survive (e.g. starred).
export const prune: <T>(
  feed: Feed,
  options: { keep: number; pin?: (item: T) => boolean },
) => Effect.Effect<void, never, FeedService>;
```

A **key function** (not a pairwise matcher) is O(n), data-drivable, and satisfies "pluggable function
to match existing objects." `pin` is exactly Subscription's "preserve starred when pruning."

A small `ensure(host, key)` helper (lazily create + attach a `Feed` Ref when missing, like the
existing `ensureContentFeed`) may accompany the module for hosts that adopt a feed after creation.

## First adopter — `plugin-product-search`

Schema:

- `Search.results: Ref<Result>[]` → **`Search.feed: Ref<Feed>`**.
- Add **`Search.resultState: Metadata.field(ResultState)`** where
  `ResultState = Schema.Struct({ starred: Schema.optional(Schema.Boolean), starredAt: Schema.optional(Schema.String) })`.
- Remove **`Result.starred`**.

Operations:

- `run-provider-search`: replace upsert-by-URL with
  `FeedCollection.appendUnique(feed, rows.map(Result.make), { identity })`. Matched rows **keep their
  original (stale) snapshot** — append-once, no in-place mutation. **Per-Provider override**:
  `Provider` gains an optional declarative identity hint (property name; default `url`); the operation
  builds the `identity` closure from it. (The kit only takes the function; the per-Provider wiring is
  product-search glue.)
- `run-search`: stop replacing results — the feed **accumulates, unbounded**. Update `lastRunAt` only.

UI (`ResultCard`, `ResultDetail`, `SearchArticle`):

- Star toggle → `Metadata.bind(search, 'resultState').patch(result.id, { starred })`.
- "Starred" filter → `resultState` ids (`Metadata.bind(...).ids(s => !!s.starred)`).
- A hook resolves feed entries (via `FeedCollection.list` / queue) and merges `resultState` for
  rendering (analogous to `plugin-feed`'s `use-post-content`).

## Retrofit (staged, follow-up PRs)

Land kit + product-search adopter first; retrofit the rest incrementally to keep PRs reviewable.

| Host | side-map → `Metadata` | feed → `FeedCollection` |
| --- | --- | --- |
| `Subscription.postState` | yes | yes (`feed`, `keep`-prune via `pin: starred`) |
| `Magazine.postState` | yes | — (Ref array, no feed) |
| `Mailbox.extracted` | yes | `Mailbox.feed` (optional) |
| `Mailbox.tags` | out of scope (inverted index) | — |

## Data flow (product-search run)

1. `run-search` invokes `run-provider-search` per provider.
2. `run-provider-search` fetches, extracts rows, `appendUnique(feed, rows, { identity })` → only
   newly-seen products are appended; existing entries are kept (stale snapshot).
3. `starred` lives in `Search.resultState`, untouched by runs.
4. UI resolves feed entries, merges `resultState`, renders; star toggle patches `resultState`.

## Testing

- `Metadata`: pure unit tests — `get` returns `{}` when absent, `patch` shallow-merges, `remove`,
  `ids` predicate filtering.
- `FeedCollection`: queue-backed tests using the `createDatabase` builder pattern from
  `plugin-feed/src/operations/curate-magazine.test.ts` — `appendUnique` dedupes by identity, `list`
  order, `prune` keeps most-recent + pinned.
- product-search: update `run-provider-search` / `autotrader-search` tests for feed semantics; add a
  test that `starred` persists across a re-run (append-once preserves the side-map entry).

## Edge cases / decisions

- Absent side-map → `get` returns `{}`; `bind` lazily initializes the record on first `patch` via
  `Obj.update`.
- Lazy feed creation for hosts that predate the feed field (`ensure`).
- Identity collisions across providers (same URL, different provider): default identity is `url`
  only; a provider may widen its identity hint if needed. Documented, not solved by default.
- Accumulate-unbounded for product-search is intentional (feed = ever-growing catalog). `prune` is
  available but not wired for product-search.

## Open items

- **Names** are provisional. `Metadata` risks confusion with `Obj.getMeta`; `FeedCollection` overlaps
  with echo's `Feed`. Candidates to revisit before finalizing: `ItemState` / `StateMap`, `FeedLog`.
- **Module path** within `@dxos/schema/src` (proposed `src/feed/`).
