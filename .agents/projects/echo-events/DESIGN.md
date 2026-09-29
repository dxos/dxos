# ECHO object events — DESIGN

Every ECHO object gets its own append-only feed of **events**. An Event is a new entity kind,
alongside Obj and Relation. It has an id, a URI and a user-defined schema. It is **immutable**,
cannot have a parent, and nothing can reference it. An event can hold refs to other entities.

Status: implemented in PR #13517 (2026-09-29). Work is tracked in the Composer project ECHO (space
DXOS), not in a local `TASKS.md`. Where the implementation departs from the original spec, the
section says so and [Implementation notes](#implementation-notes) gives the reason.

## Goals

- `Type.makeEvent` defines event types the same way `Type.makeObject` and `Type.makeRelation`
  define object and relation types.
- `Event.make(type, props)` creates an event.
- `Obj.appendEvents(obj, events)` appends events to an object's feed.
- `Query.events(obj, type)` queries one object's events. `query.events(type?)` is the traversal
  form, which reads the events of every object a query returns.
- Events store, index, replicate and export through the existing feed machinery. They need no new
  storage and no new sync protocol.

## Non-goals

- Mutable events. There is no `Event.update`, no tombstone and no soft fork of an event feed.
- Retention or compaction of event feeds. That follows whatever `Feed.setRetention` becomes.
- Events on relations, on type entities or on `Feed.Feed` objects (see [Where events are allowed](#where-events-are-allowed)).
- A `Feed.Feed` object for each per-object feed. The feed exists only in the feed-store.

## Model

### Entity kind

`EntityKind` gains a fourth member, `Event = 'event'`, after `Object`, `Relation` and `Type`
(`echo/src/internal/common/types/entity.ts:124`). The kind reaches every place that already lists
the kinds:

| Place                                                                          | Change                                                                                                                               |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| `TypeAnnotation.kind`; `makeTypeJsonSchemaAnnotation` / `decodeTypeAnnotation` | Accept and round-trip `entityKind: 'event'`.                                                                                         |
| `internal/Entity/event.ts` (new, beside `object.ts` / `relation.ts`)           | `EchoEventSchema` / `makeEventType` via `makeEchoTypeSchema(..., EntityKind.Event)`.                                                 |
| `Type.ts`                                                                      | `interface Event<T>` with `[SchemaKindId]: Event`, `makeEvent`, `AnyEvent`, `isEvent`, `expectEvent`; add `AnyEvent` to `AnyEntity`. |
| `createObject`, `assertObjectModel`, `objectFromJSON`                          | Take the Event kind from the schema annotation, or from the encoded `@kind` marker.                                                  |
| `db.addType` → `_addPersistentSchema` (`proxy-db/database.ts:463`)             | Add an Event branch to the kind derivation so user event types can be persisted.                                                     |
| `EntityMetaIndex` kind derivation (`entity-meta-index.ts:477`)                 | Write `entityKind = 'event'`.                                                                                                        |

`EntitySystem.kind` (the automerge document union) does **not** change, because events never live
in automerge documents.

### `Event` module (`@dxos/echo`)

```ts
export const Notification = Type.makeEvent(DXN.make('com.example.type.notification', '0.1.0'))(
  Schema.Struct({ title: Schema.String, subject: Ref.Ref(Person).pipe(Schema.optional) }),
);

const event = Event.make(Notification, { title: 'Hello', subject: Ref.make(person) });
```

- `Event.Unknown`, `Event.Any`, `Event.make`, `Event.isEvent`, `Event.instanceOf`, `Event.getURI`,
  `Event.getType`, `Event.getTypename`, `Event.getTimestamp`, `Event.getObjectURI` (the owning
  object's URI, once the event is appended or read back), `Event.getDatabase`, `Event.getKeys`,
  `Event.toJSON` / `fromJSON`. The names follow `Obj.*`.
- `Event.make` assigns an `ObjectId`, decodes the props against the schema, and stamps the
  creation time. The result is the same kind of typed proxy an object is, branded `[KindId] = 'event'`,
  so refs, `getURI`, JSON and feed hydration work unchanged; the public update APIs refuse it (see
  invariant 1).
- `event[Entity.KindId] === 'event'`. `Obj.isObject(event)` and `Relation.isRelation(event)` are
  false.

The name `Event` collides with `Event` from `@dxos/async`; see [decision 1](#decisions).

### Invariants

Each invariant is enforced at runtime and, where the types allow, statically.

1. **Immutable.** `Entity.update`, `Obj.update` and `Relation.update` throw
   `EventNotSupportedError`, and a direct assignment throws as it does for any entity outside an
   update. Appending an event that is already in a feed (by id, or an instance already appended)
   throws, since it would otherwise read as an update. Because entries never supersede one another, the index collapse by
   `(spaceId, queueId, objectId)` never fires for events.
2. **No parent.**
   - `Event.make` rejects `Obj.Parent` in its props.
   - `Obj.setParent` / `Relation.setParent` reject an event as either the child or the parent.
   - `Obj.getParent(event)` throws, because the owning object is not a parent.
   - Parent propagation already skips non-Object targets (`parent-annotation.ts:78`), and a test
     pins that behaviour.
3. **Not a reference target.**
   - `Ref.Ref(EventType)` is a type error: its overloads exclude `Type.Event`.
   - It also throws at schema construction, because `internal/Ref/ref.ts:167` gains a kind check.
   - `Ref.make(event)` throws.
4. **Not a relation endpoint.**
   - `Type.makeRelation` already rejects non-Object endpoint schemas (`relation.ts:126`), and a
     test pins that.
   - `Relation.make` checks both endpoint instances' kind before resolving them.
5. **May hold refs.** An event's fields can reference objects and relations. They cannot reference
   events (see 3). A ref is resolved through the owning object's database.
6. **Not in the space database.** `db.add(event)` and `db.appendToFeed(feed, [event])` throw. An
   event reaches storage only through `Obj.appendEvents`, and an event feed accepts nothing else.

### Where events are allowed

Any Object-kind entity that is persisted in a database can take events, with these exceptions:

- **`Feed.Feed` objects: throw `EventsNotSupportedError`.** A per-object feed is keyed by the
  object's id. A `Feed.Feed` already owns the feed-store feed with its own id. Allowing events on
  it would mix events into that feed's items, because `#ensureFeed` looks feeds up by
  `(spaceId, feedId)` and ignores the namespace (`feed-store.ts:146`).
- **Relations and type entities.** These are rejected by the types (`Obj.appendEvents` accepts
  `Obj.Unknown`) and at runtime.
- **Objects not yet in a database: throw.** There is no space id yet, and queueing events against
  a later `db.add` adds state for little gain.
- **Deleted objects: throw.** Events already appended to a deleted object stay in its feed; see
  [Queries](#queries) for how they are read.

`Obj.appendEvents` throws for any of these before it writes anything, so a batch never
half-applies.

## Storage

The storage mapping is the same as `Feed.Feed` → feed-store today, with the object's id in place of
the Feed object's id. Every layer below already keys on that id:

| Layer                          | Key for a `Feed.Feed`                                       | Key for an object's events   |
| ------------------------------ | ----------------------------------------------------------- | ---------------------------- |
| feed-store `feeds` row         | `(spaceId, feedId = feed.id)`                               | `(spaceId, feedId = obj.id)` |
| Feed URI (`FeedScope.feedUri`) | `echo://<space>/<feed.id>`                                  | `echo://<space>/<obj.id>`    |
| Index `objectMeta.queueId`     | `feed.id`                                                   | `obj.id`                     |
| EDGE sync                      | per `(spaceId, namespace)`; each block carries its `feedId` | unchanged                    |

**Write path.**

1. `Obj.appendEvents` is **synchronous and optimistic**, like `db.add(obj, { to: feed })`.
2. It validates the object and the events, then calls `Database.appendEvents(obj, events)`, a new
   method on the `Database` interface (`echo-sqlite` throws `UnsupportedOperationError`).
3. `DatabaseImpl` gets the object's event `FeedHandle`, keyed by `EID.make({ spaceId, entityId: obj.id })`
   and created with `events: true`, and calls `appendSync(events)`; `db.flush()` confirms the write.
4. An event handle stamps each event with `EventOwnerId` (read by `Event.getObjectURI`) instead of a
   parent, rejects anything that is not an event, and rejects an event already appended. An item
   handle rejects events. The handle cache is keyed by URI, and a kind mismatch is an invariant
   failure — safe because a `Feed.Feed` can never own events.

**Encoding.** `EchoFeedCodec` is unchanged, but the encoded JSON carries an explicit
`@kind: 'event'` marker (a new `ATTR_KIND`). This matters because the indexer
(`feed-data-source.ts`) sees only blocks and a `queueId`. It cannot tell an event feed from a
`Feed.Feed` without looking up the owner, and today the JSON has no kind key at all: relations are
recognised by `@relationSource`.

**Namespace.** Events use `data` (see [decision 2](#decisions)).

**Hydration.**

- `index-query-source-provider.ts` assumed that the object at `queueId` is a Feed
  (`parent = db.getObjectById(queueId)`).
- It now branches on the `@kind` marker: an event hydrates through the owner's event feed handle
  (`_getEventFeedHandleIfAvailable`), which gives it one identity with appended events, and never
  gets a parent. Without a feed service it decodes on its own and still records its owner.

**Space export/import.** Export enumerates `getAllFeedsForSpace`, which returns object event feeds
because they are ordinary feed-store feeds. No round-trip test exists yet (follow-up).

**EDGE.** Nothing changed, since the replicator carries `feedId` on each block and syncs per
namespace. Whether `dxos/edge` assumes every `feedId` names a Feed object (backend queries,
queue-replicator validation) is not yet verified (follow-up).

## Queries

### API

```ts
// One object's events.
Query.events(obj, Notification); // Query<Notification>
Query.events(obj); // Query<Event.Unknown>

// Traversal: events of every object the query returns.
Query.select(Filter.type(Task)).events(Notification);
```

- `Query<T>.events(type?)` is declared only where `T extends Obj.Unknown`, so calling it on a
  relation query is a type error.
- The optional argument is a `Type.Event`. Further filters chain as usual:
  `.events(Viewed).select({ by: 'alice' })` filters the events, not their owners.
- **`Query.events(obj, type)` is sugar** for `Query.select(Filter.id(obj.id)).events(type)`, which
  keeps a single execution path; `db.query` scopes it to the database as it does any unscoped query.
  The anchor is selected from the space's documents, so an object that is itself a feed item can
  hold events but `Query.events` does not find them (see [Implementation notes](#implementation-notes)).

### AST

This adds a new query node to `echo-protocol/src/query/ast.ts`, beside `hierarchy-traversal`:

```ts
{ type: 'event-traversal', anchor: Query }
```

The event filter is an ordinary `filter` clause over the traversal, the way `.select()` narrows any
selection. The node is added to `visit` / `map` / `fold`, which use exhaustive `Match`, and to
`Query.pretty` (`.events()`). `echo-sqlite`'s compiler rejects it with `UnsupportedQueryError`,
since that store holds no feeds.

### Execution

The planner (`echo-host/src/query/query-planner.ts`) lowers `event-traversal` to the anchor's steps,
then a `TraverseStep` with a new `EventTraversal` traversal, then the usual deleted-handling steps.
Both host executors run it:

- **In-memory executor** — groups the anchors by space and calls the new
  `IndexEngine.queryEvents({ spaceId, ownerIds })`, which reads `objectMeta` rows with
  `entityKind = 'event' AND queueId IN (ownerIds)`, then loads their blocks.
- **SQL executor** (the default) — joins the working set to `objectMeta` on
  `queueId = objectId AND entityKind = 'event'` through the existing `(spaceId, queueId, objectId)`
  index.

Behaviour:

- **Anchors are filtered first**, so a deleted object contributes no events unless the query uses
  `deleted: 'include'`.
- **Anchors do not need to be local.** The client working-set executor has no case for the traversal
  and returns no result, so the index query source answers, as it does for feed-scoped queries.
- **Order.** Results come back in index order, which is append order for one writer. No explicit
  ordering step is added; `orderBy` overrides it.
- **Read-your-writes and reactivity.** Unflushed events show up in reactive results through the
  owner's event feed handle, and a subscription re-fires on append (tested locally; replicated
  appends are not tested).

### Isolation

Events never leak into other query paths:

- Every select step drops events — `entityKind != 'event'` in the SQL select scope and in
  reverse-reference lookups, and a post-filter in the in-memory executor. So
  `Query.select(Filter.everything())`, with or without `{ includeFeeds: true }`, `referencedBy`,
  and a feed-scoped select never return events.
- `children()` excludes events (`EntityMetaIndex.queryChildren` and the SQL hierarchy join), since an
  object's events share its id as their queue id.
- `Query.from(feed)` on a `Feed.Feed` never returns events, because the ids differ.
- Events of object A never show up in object B's events.

The original spec rejected `Query.from(Scope.feed(objectUri))`; with the select-step exclusion such a
query simply returns no events, so no rejection was added.

## Tests

| Package           | File                                             | Covers                                                                                                                                                                                                                                              |
| ----------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `echo`            | `src/Event.test.ts` (16)                         | Type kind + JSON schema; `Event.make` (id, timestamp, validation, rejects object types and parents); immutability; parent, ref and relation-endpoint rejection (runtime and `@ts-expect-error`); JSON round trip; `appendEvents` guards; query AST. |
| `index-core`      | `src/indexes/entity-meta-index.test.ts`          | Event rows indexed with `entityKind = 'event'`, returned by `queryEvents`, excluded from `queryChildren`.                                                                                                                                           |
| `echo-host`       | `src/query/query-planner.test.ts`                | `event-traversal` plans to select → `EventTraversal` → event filter.                                                                                                                                                                                |
| `echo-client-e2e` | `src/events.test.ts` (10 cases × both executors) | Append/query, type filters, traversal, per-object isolation, isolation from object/feed/children queries, refs, pending events before flush, reload persistence, input validation, deleted owners.                                                  |

Not covered yet (follow-ups): two-peer replication through EDGE, space export/import round trip, a
`dxos/edge` workerd test, and a resume-by-cursor traversal.

## Implementation notes

Where the implementation departs from the spec above, and why:

1. **Events are typed proxies, not deep-frozen plain values.** Reusing the object proxy keeps refs,
   URIs, JSON and feed hydration unchanged. Immutability comes from the public update APIs throwing
   and from the existing rule that an entity cannot be assigned to outside an update. Feed
   bookkeeping (positions) still writes meta through the internal `change`.
2. **`Event.getTimestamp` is the creation time, not the block timestamp.** Decoded feed items do not
   carry their block's timestamp, and an unflushed event has no block. `Event.make` stamps
   `Date.now()` once; it is serialized as `@timestamp` and never changes, so it is still read-only.
3. **`Event.getObjectURI` instead of `Event.getObject`.** The event records its owner's URI
   (`EventOwnerId`); resolving the object is left to the caller, which avoids holding a strong
   reference from every event to its owner.
4. **No `Type.makeEventFromJsonSchema`.** Static event types cover user-defined types. `db.addType`
   of a static event type persists it with the event kind.
5. **Owners that are feed items.** `Obj.appendEvents` accepts any object in a database, including
   an object that is itself a feed item, but `Query.events` selects its anchor from the space's
   documents and so does not find such an owner's events.

## Decisions

1. **Namespace name: `Event`.** It collides with `@dxos/async`'s `Event`, so modules that need both
   alias the async one (`import { Event as AsyncEvent } from '@dxos/async'`).
2. **Feed namespace: `data`.** Events replicate and are retained like other data. The namespace is
   fixed by a feed's first append (`#ensureFeed`), so it can never vary per event within one object.
3. **Timestamp: `Event.getTimestamp(event)`**, read-only. It is the creation time stamped by
   `Event.make` (see [Implementation notes](#implementation-notes)). Event types that need a domain
   time carry their own field.

## Open questions

1. **Snapshots.** Should `Obj.getSnapshot` / `Obj.clone` of an owner ever include its events?
   Recommendation: no. Events are reached only through queries.
