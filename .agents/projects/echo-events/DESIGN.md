# ECHO object events — DESIGN

Every ECHO object gets its own append-only feed of **events**. An Event is a new entity kind,
alongside Obj and Relation. It has an id, a URI and a user-defined schema. It is **immutable**,
cannot have a parent, and nothing can reference it. An event can hold refs to other entities.

Status: spec, 2026-09-29. Nothing is implemented yet. Phases are tracked in `TASKS.md`.

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

| Place                                                                          | Change                                                                                                                                                          |
| ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TypeAnnotation.kind`; `makeTypeJsonSchemaAnnotation` / `decodeTypeAnnotation` | Accept and round-trip `entityKind: 'event'`.                                                                                                                    |
| `internal/Entity/event.ts` (new, beside `object.ts` / `relation.ts`)           | `EchoEventSchema` / `makeEventType` via `makeEchoTypeSchema(..., EntityKind.Event)`.                                                                            |
| `Type.ts`                                                                      | `interface Event<T>` with `[SchemaKindId]: Event`, `makeEvent`, `AnyEvent`, `isEvent`, `expectEvent`, `makeEventFromJsonSchema`; add `AnyEvent` to `AnyEntity`. |
| `createObject`, `assertObjectModel`, `objectFromJSON`                          | Take the Event kind from the schema annotation, or from the encoded `@kind` marker.                                                                             |
| `db.addType` → `_addPersistentSchema` (`proxy-db/database.ts:463`)             | Add an Event branch to the kind derivation so user event types can be persisted.                                                                                |
| `EntityMetaIndex` kind derivation (`entity-meta-index.ts:477`)                 | Write `entityKind = 'event'`.                                                                                                                                   |

`EntitySystem.kind` (the automerge document union) does **not** change, because events never live
in automerge documents.

### `Event` module (`@dxos/echo`)

```ts
export const Notification = Type.makeEvent(DXN.make('com.example.type.notification', '0.1.0'))(
  Schema.Struct({ title: Schema.String, subject: Ref.Ref(Person).pipe(Schema.optional) }),
);

const event = Event.make(Notification, { title: 'Hello', subject: Ref.make(person) });
```

- `Event.Unknown`, `Event.Any`, `Event.make`, `Event.isEvent`, `Event.getURI`, `Event.getType`,
  `Event.getTypename`, `Event.getTimestamp`, `Event.toJSON` / `fromJSON`, `Event.getObject(event)` (the owning object,
  once the event is attached or hydrated). The names follow `Obj.*`.
- `Event.make` assigns an `ObjectId`, decodes the props against the schema, and returns a
  **deep-frozen** value. It is a plain immutable value, like a snapshot. It is not a reactive proxy,
  so it needs no `FeedObjectCore`, no `Obj.subscribe` and no atoms.
- `Entity.getKind(event) === 'event'`. `Obj.isObject(event)` and `Relation.isRelation(event)` are
  false.

The name `Event` collides with `Event` from `@dxos/async`; see [decision 1](#decisions).

### Invariants

Each invariant is enforced at runtime and, where the types allow, statically.

1. **Immutable.** `Entity.update`, `Obj.update` and `Obj.setValue` throw on an event, and the
   values are frozen. Appending an event whose id is already in the feed throws, since it would
   otherwise read as an update. Because entries never supersede one another, the index collapse by
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
   - `Relation.make` gains an instance kind check in `getObjectEchoUri`, which today does not look
     at the kind.
5. **May hold refs.** An event's fields can reference objects and relations. They cannot reference
   events (see 3). A ref is resolved through the owning object's database.
6. **Not in the space database.** `db.add(event)` throws. An event reaches storage only through
   `Obj.appendEvents`.

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
2. It resolves `Obj.getDatabase(obj)`, then gets a `FeedHandle` for `EID.make({ spaceId, entityId: obj.id })`.
3. It calls `appendSync(events)`, and `db.flush()` confirms the write.
4. `DatabaseImpl` gains `#getEventFeedHandle(obj)`, which is `#getFeedHandle` without the `Feed.Feed`
   lookup and without `setParentEntity`. The owner is recorded as `Event.getObject`, never as a parent.

**Encoding.** `EchoFeedCodec` is unchanged, but the encoded JSON carries an explicit
`@kind: 'event'` marker (a new `ATTR_KIND`). This matters because the indexer
(`feed-data-source.ts`) sees only blocks and a `queueId`. It cannot tell an event feed from a
`Feed.Feed` without looking up the owner, and today the JSON has no kind key at all: relations are
recognised by `@relationSource`.

**Namespace.** Events use `data` (see [decision 2](#decisions)).

**Hydration.**

- `index-query-source-provider.ts:590-630` currently assumes that the object at `queueId` is a Feed
  (`parent = db.getObjectById(queueId)`).
- It gains an `entityKind === 'event'` branch. That branch looks up the owner the same way, then
  builds a frozen `Event` with `Event.getObject` set to the owner.
- It sets no parent and attaches no `FeedObjectCore`.

**Space export/import.** Export enumerates `getAllFeedsForSpace`, which already returns object
feeds because they are ordinary feed-store feeds. The work is a test that proves a round trip.

**EDGE.** Nothing should change, since the replicator carries `feedId` on each block and syncs per
namespace. One task verifies that `dxos/edge` does not assume every `feedId` names a Feed object
(backend queries, queue-replicator validation).

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
- The optional argument is a `Type.Event` or an event `Filter` (`Filter.type`, `Filter.props`,
  `Filter.feedCursor`).
- **`Query.events(obj, type)` is sugar** for
  `Query.select(Filter.id(obj.id)).events(type).from(Obj.getDatabase(obj))`. This keeps a single
  execution path. It throws if `obj` has no database.

### AST

This adds a new query node to `echo-protocol/src/query/ast.ts`, beside `hierarchy-traversal`:

```ts
{ type: 'event-traversal', anchor: Query, filter: Filter }
```

The node is added to `visit` / `map` / `fold`, which use exhaustive `Match`, and to `Query.pretty`.

### Execution

The planner (`echo-host/src/query/query-planner.ts`) lowers `event-traversal` to:

1. Run the anchor.
2. Take the anchor ids as `queueId`s.
3. Run a feed select restricted to `entityKind = 'event'`.
4. Apply the filter.

This reuses the feed-scope selection that `extractQueueRefs` already builds.

- **Anchors are filtered first.** The anchor's normal filtering runs first, so a deleted object
  contributes no events unless the query uses `deleted: 'include'`.
- **Anchors do not need to be local.** Traversal works from index results, not the client working
  set. The client `SpaceQuerySource` (`noIndexes: true`) therefore delegates event traversal to the
  index query source, the same way feed-scoped queries go there today.
- **Default order is append order**: position first, then `insertionId` for unpositioned local
  blocks. `orderBy` overrides it.
- **Read-your-writes.** Events appended but not yet flushed appear in reactive query results
  through the owner's `FeedHandle`, as pending `db.add(..., { to: feed })` items do today.
- **Reactivity.** A subscribed events query re-fires on append, both local and replicated.

### Isolation

Events never leak into other query paths. Each of these has a test:

- `Query.select(Filter.everything())` on a database, with or without `{ includeFeeds: true }`,
  returns no events. Feed-including space queries gain an `entityKind != 'event'` filter.
- `Query.from(feed)` on a `Feed.Feed` never returns events. This holds by construction, because the
  ids differ.
- `Query.from(Scope.feed(objectUri))` is rejected, which keeps one public way in.
- Events of object A never show up in object B's events.

## Test plan

### `echo` (in-memory, no database)

- `Type.makeEvent` sets the annotation kind, and the event's JSON schema round-trips with
  `entityKind: 'event'`.
- `Event.make`:
  - decodes props and rejects invalid ones;
  - assigns an id;
  - returns a deep-frozen value;
  - rejects `Obj.Parent` in its props.
- Guards: `Event.isEvent`, `Entity.getKind`, and `Obj.isObject` / `Relation.isRelation` return
  false.
- Immutability: `Entity.update` / `Obj.update` / `Obj.setValue` throw.
- Parent: `Obj.setParent(event, obj)` and `Obj.setParent(obj, event)` throw, `Obj.getParent(event)`
  throws, and parent propagation skips events.
- Refs:
  - `Ref.make(event)` throws;
  - `Ref.Ref(EventType)` throws, and a `@ts-expect-error` covers the type;
  - an event holding a `Ref` to an object round-trips through `toJSON` / `fromJSON`.
- Relations: `Type.makeRelation` with an event endpoint throws, and `Relation.make` with an event
  instance throws.
- `Obj.appendEvents` throws on:
  - an object that is not in a database;
  - a relation (with `@ts-expect-error`);
  - a `Feed.Feed`.
- Query builder:
  - `Query.events(obj, T)` and `.events(T)` build the expected AST;
  - `Query.pretty` renders it;
  - `.events` on a relation query carries `@ts-expect-error`.

### `echo-protocol`

- `event-traversal` passes through `visit` / `map` / `fold`.
- `EchoFeedCodec` round-trips `@kind: 'event'`.

### `echo-host`

- The planner lowers `event-traversal` to anchor → feed select plus the kind filter.
- The executor returns only events for the anchor ids, in append order.
- `EntityMetaIndex` writes `entityKind = 'event'` for event blocks.

### `echo-client-e2e` (new `events.test.ts`)

- **Append and query.** Append then query returns the events, typed. Two event types on one object
  can be filtered by type.
- **Traversal.** A traversal over many objects returns the union of their events. Filters on the
  events apply, and `Filter.feedCursor` resumes a traversal.
- **Before and after flush.**
  - Before `db.flush()`: a reactive query sees the pending events.
  - After flush: a non-reactive query sees them.
  - After closing and reopening the peer: they persist.
- **Reactivity.** A subscription fires on each append.
- **Refs.** A ref inside an event resolves to the live object.
- **Isolation.**
  - A database query, with or without `includeFeeds`, returns no events.
  - A `Feed.Feed` query returns no events.
  - Events on object A are absent from object B.
- **Errors.** `Obj.appendEvents` on a `Feed.Feed` throws, and nothing is written. Appending a
  duplicate event id throws.
- **Deleted owner.** Events of a deleted object are hidden by default and visible with
  `deleted: 'include'`.
- **Two peers.** Events replicate through the test EDGE sync path, if `EchoTestBuilder` supports it
  (otherwise that test lives in `client-services`).

### `client-services`

- A space export/import round trip keeps each object's events.

### `dxos/edge`

- Events on an object replicate through a real edge worker test (`*.workerd.test.ts`), with no
  Feed object present.

## Decisions

1. **Namespace name: `Event`.** It collides with `@dxos/async`'s `Event`, so modules that need both
   alias the async one (`import { Event as AsyncEvent } from '@dxos/async'`).
2. **Feed namespace: `data`.** Events replicate and are retained like other data. The namespace is
   fixed by a feed's first append (`#ensureFeed`), so it can never vary per event within one object.
3. **Timestamp: `Event.getTimestamp(event)`.** It exposes the block timestamp, read-only. Event
   types that need a domain time carry their own field.

## Open questions

1. **Snapshots.** Should `Obj.getSnapshot` / `Obj.clone` of an owner ever include its events?
   Recommendation: no. Events are reached only through queries.
