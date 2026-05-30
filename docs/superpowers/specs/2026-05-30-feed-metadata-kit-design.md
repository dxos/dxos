# Feed + Metadata Kit — Design

Date: 2026-05-30
Status: Implemented — kit primitives + three adopters landed. (`FeedCollection` not built; inlined where needed.)
Packages: `@dxos/echo` (`TagIndex`, `Tagging`, `StateMap`, `Tag.findOrCreate`).
Adopters: `@dxos/plugin-inbox`, `@dxos/plugin-product-search`, `@dxos/plugin-feed`.

## Implementation status

Kit (all in `@dxos/echo`):

- **`TagIndex`** — inverse tag index `Record<tagId, objectId[]>` for immutable feed objects. `field()`
  - `bind()` (`setTag`/`unsetTag`/`objects`/`tags`/`tagIds`). No embedded labels.
- **`Tagging`** — unifies tagging across mutable objects (`Obj.getMeta(obj).tags`) and immutable feed
  objects (host `TagIndex` via `{ host }`); `get`/`set`/`unset`/`resolve`.
- **`StateMap`** — the (A) primitive: generic per-object metadata side-map `Record<objectId, S>`
  (`field`/`bind` with `get`/`patch`/`remove`/`ids`/`entries`). For non-tag metadata.
- **`Tag.findOrCreate(db, { label, hue?, key? })`** — find-or-create a `Tag` object by foreign key
  (system/provider tags) or by label (user tags). Shared by all adopters.

Adopters (all landed):

- **`plugin-inbox`** — `Mailbox.tags` is a `TagIndex`; labels/hues on `Tag` objects (user tags by
  label, Gmail provider tags by foreign key). The inbox tag path keys on tag **URIs**.
- **`plugin-product-search`** — `Search.results` → `Search.feed` (immutable `Result` queue;
  append-once by url); `Result.starred` → a `Tag` indexed on `Search.tags`. `SearchArticle` owns the
  tag state; `ResultCard`/`ResultDetail` are presentational.
- **`plugin-feed`** — per-Post state hosted on the **Subscription** (so every surface resolves it via
  `post.source.target`): `Subscription.postState = StateMap({ readAt })` + `tags = TagIndex`
  (starred/archived as system `Tag` objects, `STARRED_TAG`/`ARCHIVED_TAG`). `Magazine.postState =
StateMap({ rank })`. `snippet`/`imageUrl` are **not stored** — derived from `post.description`, or
  the refined values written to `PostContent` (contentFeed) by `LoadPostContent`. A `useSystemTags`
  hook resolves the star/archive uris for sync render/filter.

Not built: **`FeedCollection`** (B). The product-search feed append-once was inlined in
`run-provider-search` (list-existing-by-url → append-new); extract `FeedCollection` if a second feed
adopter needs it.

> Naming notes: the (A) primitive shipped as **`StateMap`** (not `Metadata`) to avoid collision with
> `Obj.getMeta`/`ObjectMeta`; the (C) primitive shipped as tag-specific **`TagIndex`** (not a generic
> `Index` with embedded `extra`) since labels live on `Tag` objects. The generic `Index`/`extra`
> design below is retained for historical context.

> Earlier-considered alternative for `plugin-feed`: consolidating per-Post state on the **Magazine**.
> Rejected because Post-keyed surfaces (`PostArticle`/`PostCard`/`PostContent`) lack magazine context
> (and a Post can be in multiple magazines); hosting on the **Subscription** lets every surface
> resolve the state via `post.source.target`, with no UI degrade.

> Note: the (C) primitive landed as a **tag-specific `TagIndex` in `@dxos/echo`**, not a generic
> `Index` with embedded per-group `extra` in `@dxos/schema`. Tags reference `@dxos/echo` `Tag`
> objects (labels editable centrally), so the index stores only `objectId[]` per tag. The generic
> `Index`/`extra` design below is retained for historical context; `TagIndex` is the shipped shape.

## Problem

Several plugins hang **mutable, indexed state off a host object** alongside (often immutable)
collections. Today each plugin hand-rolls the read/patch/index helpers, with no shared primitive.
Three related-but-distinct shapes recur:

**A. Per-item metadata side-map** — `Record<objectId, S>`, one metadata struct per item:

- `Subscription.postState` — `Record<postId, { imageUrl?, readAt?, archived?, starred?, starredAt? }>`,
  with Posts living in `Subscription.feed` (an ECHO Feed queue). Has a `keep`-bound prune that
  preserves starred Posts.
- `Magazine.postState` — `Record<postId, { snippet?, rank? }>`, magazine-scoped. Items are a
  `Ref[]` array — **no feed**.
- `Mailbox.extracted` — `Record<messageId, string[]>`, with Messages in `Mailbox.feed`.
- `plugin-product-search` (target) — wants `Search.Result` objects stored in a feed, with `starred`
  moved off the (now immutable) Result into a side-map.

**B. Immutable feed collection** — an ECHO Feed queue of immutable items: `Subscription.feed`,
`Mailbox.feed`, and the new product-search results feed.

**C. Group / inverse index** — `Record<groupKey, ID[]>` (or `Ref[]`), grouping object ids under a
key. Distinct from (A): the value is a _membership array_, not per-object metadata. Existing
instances:

- `Mailbox.tags` — `Record<tagId, { label, hue?, source?, messages: Ref<Message>[] }>`: tag → message
  Refs, with extra per-tag metadata.
- `Kanban.arrangement.columns` — `Record<columnValue, { ids: Obj.ID[], hidden? }>`: column → card ids.
- `plugin-trello` sync snapshot — `Record<listName, { ids: string[] }>`: list → card ids.

`Mailbox.tags` is **in scope** as the motivating case for (C), but the **tag-specific handling**
(label/hue, provider-vs-user source, Gmail-label sync, `applyTag`/`removeTag` UX) is **implemented
separately** on top of the generic index primitive — the kit provides only the indexing building
block.

## Goals

- A reusable, composable kit covering the existing use cases, retrofittable onto them.
- Three **independent** primitives — a metadata side-map (A), an immutable feed collection (B), and a
  group/inverse index (C). Each stands alone; plugins compose only what they need (Magazine uses the
  side-map with no feed; Kanban uses the index with no feed).
- Convert `plugin-product-search` as the first adopter (exercises A + B).

## Non-goals

- Tag-specific UX/semantics (labels, hues, provider sync, `applyTag`). The `Index` primitive is
  generic; Mailbox's tag handling is a **separate module** built on it.
- A unified "AnnotatedFeed" object that forces a feed where none exists.
- Bounded/pruned feeds for product-search (it accumulates unbounded — see below). `prune` exists in
  the kit for Subscription's benefit but product-search does not call it.

## API

The kit lives in `@dxos/schema` under `src/feed/` and is exposed as three `// @import-as-namespace`
modules (`Metadata`, `FeedCollection`, `Index`).

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

### `TagIndex` — inverse tag index (shipped, `@dxos/echo`)

In-document `Record<tagId, objectId[]>` mapping a tag id to the ids of objects carrying it. Pure
(`Obj.update`). The tag id is an existing `@dxos/echo` `Tag` object's URI — **labels/hues are not
stored here**; they live on the `Tag` object (edited once, applied everywhere). Tags are sparse, so
keying by tag (not object) keeps the index small and makes "filter the feed by tag" a single lookup.

```ts
// @import-as-namespace  → imported as `TagIndex`

// Schema fragment: optional Record<tagId, objectId[]>, hidden from forms.
export const field: () => /* optional Record<string, ID[]> */;

export interface Accessor {
  tagIds(): string[];
  objects(tagId: string): readonly string[];   // object ids carrying the tag ([] when absent)
  tags(objectId: string): string[];            // inverse lookup: tags applied to an object
  setTag(tagId: string, objectId: string): void;
  unsetTag(tagId: string, objectId: string): void; // prunes the tag entry when it empties
}
export const bind: (host: Obj.Any, key: string) => Accessor;
```

### `Tagging` — unified object tagging (shipped, `@dxos/echo`)

One entry point for "the tags on an object", regardless of where they live:

```ts
// @import-as-namespace  → imported as `Tagging`

export interface Options {
  host?: Obj.Any;
  key?: string /* default 'tags' */;
}

// host present → immutable feed object: read/write the host's TagIndex.
// host absent  → mutable db object: read/write Obj.getMeta(obj).tags.
export const get: (object: Obj.Any, options?: Options) => string[];
export const set: (object: Obj.Any, tagId: string, options?: Options) => void;
export const unset: (object: Obj.Any, tagId: string, options?: Options) => void;

// Resolve tag ids (URIs) to Tag object refs.
export const resolve: (db, tagIds: readonly string[]) => Ref.Ref<Tag.Tag>[];
```

Tag identity is the **`Tag` object URI** everywhere — the same id space as `meta.tags` and
`Filter.tag`. `Filter.tag(uri)` matches mutable db objects; feed objects are filtered via
`TagIndex.objects(uri)` (they're queue items, not db rows).

> The generic `Index` (group → ids + `extra`) below is the original, pre-tag design. `Kanban.
arrangement.columns` / `plugin-trello` snapshots remain candidates for a generic `Index` if one is
> later needed; tags use `TagIndex`.

#### (historical) generic `Index` — group / inverse index

`Record<groupKey, { ids: ID[] } & Extra>` with `members`/`groupsOf`/`add`/`remove`/`meta`/`setMeta`.
Superseded for tags by `TagIndex` (which drops `extra`, since tag metadata lives on `Tag` objects).

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

Retrofit incrementally to keep PRs reviewable.

| Host                     | `Metadata` (A) | `FeedCollection` (B)                          | `TagIndex` (C)              |
| ------------------------ | -------------- | --------------------------------------------- | --------------------------- |
| `Mailbox.tags`           | —              | —                                             | **done**                    |
| `Subscription.postState` | yes            | yes (`feed`, `keep`-prune via `pin: starred`) | `starred` → tag (candidate) |
| `Magazine.postState`     | yes            | — (Ref array, no feed)                        | —                           |
| `Mailbox.extracted`      | yes            | `Mailbox.feed` (optional)                     | —                           |
| `plugin-product-search`  | `starred` (A)  | results feed (B)                              | (or `starred` → tag)        |

### Tag retrofit candidates (other plugins)

Plugins with **immutable feed/queue objects** that could adopt `TagIndex`/`Tagging` for per-item
flags (star/pin/bookmark/read/archive), ranked by retrofit ease:

- **plugin-feed** (`Subscription`) — Posts in `feed`; `postState.{starred,archived,readAt}` are
  effectively tags (the schema comment already notes `starred` replaced an `Obj.getMeta + STAR_TAG`
  pattern). `imageUrl` stays metadata (A). `Magazine.postState.{snippet,rank}` is per-magazine
  curation, not tags — keep on (A). Medium effort (helpers in `post-state.ts`, data migration).
  `plugin-bluesky` reuses `Subscription`, so it inherits this.
- **plugin-assistant** (`Chat`), **plugin-thread** (`Channel`), **plugin-discord** / **plugin-slack**
  (channel message feeds) — immutable message feeds with no per-message flags yet. Low effort: pure
  addition of a `TagIndex` for star/pin/bookmark.
- **plugin-product-search** (`Search.Result`) — `starred` could be a tag instead of (A) metadata, if
  results become feed-stored (see adopter section). Decide A-vs-tag when building the adopter.

Already correct (mutable db objects via `Obj.getMeta(obj).tags` + `Filter.tag`), **not** candidates:
`plugin-table`/`-map`/`-kanban`/`-automation` (query Views by tag), `plugin-trip`, `plugin-debug`.
These could still benefit from the `Tagging` read helper for consistency, but need no structural
change. `Kanban.arrangement.columns` / `plugin-trello` snapshots are group→ids indexes but **not
tags** (would want a generic `Index`, not `TagIndex`).

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
- `TagIndex` (landed): pure `@dxos/echo` unit test — `setTag`/`unsetTag`, `objects`/`tags` inverse
  lookup, empty-tag pruning. Plus an `@dxos/echo-db` real-db + feed integration test (tag immutable
  feed objects, filter the feed by tag).
- `Tagging` (landed): `@dxos/echo-db` real-db test — mutable `meta.tags` path, immutable feed `TagIndex`
  path, and `resolve` of tag ids → `Tag` objects.
- Mailbox retrofit (landed): real-db + feed test — `applyTag` find-or-creates a `Tag` and indexes the
  message (idempotent by label), `removeTag` unsets; `match-filter` tag filter on tag URIs.
- product-search (pending): update `run-provider-search` / `autotrader-search` tests for feed
  semantics; add a test that `starred` persists across a re-run.

## Edge cases / decisions

- Absent side-map → `get` returns `{}`; `bind` lazily initializes the record on first `patch` via
  `Obj.update`.
- Lazy feed creation for hosts that predate the feed field (`ensure`).
- Identity collisions across providers (same URL, different provider): default identity is `url`
  only; a provider may widen its identity hint if needed. Documented, not solved by default.
- Accumulate-unbounded for product-search is intentional (feed = ever-growing catalog). `prune` is
  available but not wired for product-search.

## Open items

Resolved:

- (C) shipped as **`TagIndex`** + **`Tagging`** in `@dxos/echo` (not a generic `Index` in
  `@dxos/schema`). Value shape is bare `Obj.ID[]` (tag metadata lives on `Tag` objects). Tag identity
  is the `Tag` object URI throughout.

Still open:

- **Names** for the unbuilt (A)/(B) primitives — `Metadata` risks confusion with `Obj.getMeta`;
  `FeedCollection` overlaps with echo's `Feed`. Revisit when building them in `@dxos/schema/src/feed/`.
- **product-search `starred`**: model as (A) `Metadata` side-map or as a `Tag` (`Tagging`)? Decide
  when building the adopter — a `Tag` gives cross-surface consistency; a side-map is lighter if
  `starred` is purely local.
- Whether mutable-object tag call sites (`plugin-table`/`-trip`/`-debug`) should adopt the `Tagging`
  read helper for consistency (no structural change required).
