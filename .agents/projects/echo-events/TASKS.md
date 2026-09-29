# ECHO object events — TASKS

_Resume: spec landed as DESIGN.md; no code exists yet. NEXT: phase 1 (entity kind + `Event` module)._

See DESIGN.md for the model, storage mapping, query semantics and test plan.

## Phase 1 — Entity kind and `Event` module (`echo`)

- [ ] `EntityKind.Event`; `TypeAnnotation`, `makeTypeJsonSchemaAnnotation`, `decodeTypeAnnotation`.
- [ ] `internal/Entity/event.ts`: `EchoEventSchema` / `makeEventType`.
- [ ] `Type.makeEvent`, `Type.Event`, `AnyEvent`, `isEvent`, `expectEvent`, `makeEventFromJsonSchema`; `AnyEntity`.
- [ ] `Event` module: `make` (deep-frozen), `Unknown`, `Any`, `isEvent`, `getURI`, `getType`, `getTypename`,
      `getTimestamp`, `getObject`, `toJSON` / `fromJSON`.
- [ ] `ATTR_KIND` (`@kind: 'event'`) in `objectFromJSON` / `objectStructureToJson`.
- [ ] Invariants: immutability, no parent, not a ref target (`Ref.Ref` + `Ref.make`), not a relation endpoint
      (`getObjectEchoUri`), `db.add(event)` throws.
- [ ] `echo` unit tests from DESIGN.md §Test plan.

## Phase 2 — Storage and append (`echo-client`, `echo-host`, `index-core`)

- [ ] `Obj.appendEvents` (sync, optimistic) + `EventsNotSupportedError` for `Feed.Feed`, relations, types,
      detached and deleted objects, duplicate ids.
- [ ] `DatabaseImpl.#getEventFeedHandle(obj)` — no Feed lookup, no `setParentEntity`.
- [ ] `EntityMetaIndex` writes `entityKind = 'event'`.
- [ ] Hydration branch in `index-query-source-provider.ts` for event results.
- [ ] `_addPersistentSchema` Event branch (`db.addType` for user event types).

## Phase 3 — Queries (`echo`, `echo-protocol`, `echo-host`, `echo-client`)

- [ ] `event-traversal` AST node; `visit` / `map` / `fold`; `Query.pretty`.
- [ ] `Query<T extends Obj.Unknown>.events(type?)` and `Query.events(obj, type?)` sugar.
- [ ] Planner lowering: anchor → feed select on anchor ids with `entityKind = 'event'`; append-order default.
- [ ] Client `SpaceQuerySource` delegates event traversal to the index source; read-your-writes via `FeedHandle`.
- [ ] Isolation: exclude events from `includeFeeds` space queries; reject `Scope.feed(objectUri)`.
- [ ] `echo-protocol` and `echo-host` tests.

## Phase 4 — End-to-end

- [ ] `echo-client-e2e/src/events.test.ts` (full list in DESIGN.md).
- [ ] `client-services` space export/import round trip.
- [ ] `dxos/edge`: verify nothing assumes every `feedId` is a Feed object; workerd replication test.
- [ ] `echo` skill: document events; changeset for `@dxos/echo`.

## Open

- [ ] Snapshots/clones of an owner never include its events (DESIGN.md open question 1) — confirm.
