//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Filter, Query } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import { EID, EntityId, SpaceId } from '@dxos/keys';

import { QueryExecutor } from '../query/query-executor';
import { type InvalidationHint, canonicalTypename, hintFromIndexingResult, mergeHints } from './invalidation-hint';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeHint = (partial: Partial<InvalidationHint>): InvalidationHint => partial;

const makeSpaceSet = (...ids: SpaceId[]) => new Set<SpaceId>(ids);
const makeTypeSet = (...types: string[]) => new Set<string>(types);
const makeObjectSet = (...ids: EntityId[]) => new Set<EntityId>(ids);

const SPACE_ID = SpaceId.make('B2NJDFNVZIW77OQSXUBNAD7BUMBD3G5PO');

// Versioned type DXNs as recorded on stored objects / raw IndexingResults.
const PERSON_DXN = 'dxn:com.example.type.person:0.1.0';
const ORG_DXN = 'dxn:com.example.type.organization:0.1.0';

// Canonical (version-less) typenames as carried by an InvalidationHint and a query scope.
const PERSON_TYPENAME = 'com.example.type.person';
const ORG_TYPENAME = 'com.example.type.organization';

// Stable queue DXN mirroring query-planner.test.ts.
const QUEUE_DXN = EID.parse('dxn:queue:data:B2NJDFNVZIW77OQSXUBNAD7BUMBD3G5PO:01JJRA86VK4H1TEB6QQVSWXP0E');
const QUEUE_SPACE_ID = SpaceId.make('B2NJDFNVZIW77OQSXUBNAD7BUMBD3G5PO');
const QUEUE_ID = EntityId.make('01JJRA86VK4H1TEB6QQVSWXP0E');

const withSpace = (q: Query.Any): Query.Any => q.from([{ _tag: 'space' as const, spaceId: SPACE_ID }]);

/**
 * Creates a QueryExecutor with no real dependencies — only the query is used
 * to build the plan and cached scopes via extractScopes().
 */
const makeExecutor = (query: { ast: any }): QueryExecutor =>
  new QueryExecutor({
    indexEngine: {} as any,
    runtime: {} as any,
    automergeHost: {} as any,
    spaceStateManager: {} as any,
    queryId: 'test',
    query: query.ast,
    reactivity: 'reactive' as any,
  });

// ---------------------------------------------------------------------------
// hintFromIndexingResult
// ---------------------------------------------------------------------------

describe('hintFromIndexingResult', () => {
  test('returns undefined when nothing was indexed', ({ expect }) => {
    const result = hintFromIndexingResult({
      updated: 0,
      done: true,
      spaces: new Set(),
      queues: new Set(),
      documents: new Set(),
      types: new Set(),
      objects: new Set(),
    });
    expect(result).toBeUndefined();
  });

  test('converts populated result to hint with non-empty dimensions', ({ expect }) => {
    const spaceId = SpaceId.random();
    const objectId = EntityId.random();
    const result = hintFromIndexingResult({
      updated: 1,
      done: true,
      spaces: new Set([spaceId]),
      queues: new Set(),
      documents: new Set(['doc-1']),
      types: new Set([PERSON_DXN]),
      objects: new Set([objectId]),
    });
    expect(result).toBeDefined();
    expect(result!.spaceIds?.has(spaceId)).toBe(true);
    // Versioned object type is canonicalized to the bare typename.
    expect(result!.typenames?.has(PERSON_TYPENAME)).toBe(true);
    expect(result!.typenames?.has(PERSON_DXN)).toBe(false);
    expect(result!.objectIds?.has(objectId)).toBe(true);
    // Empty queues → undefined (no queue constraint)
    expect(result!.queueIds).toBeUndefined();
  });

  // Regression for DX-966: stored object types arrive versioned (and sometimes with the legacy
  // `dxn:type:` prefix); the hint must reduce them to the bare typename so it can match a
  // version-less type filter scope.
  test('canonicalizes versioned and legacy-prefixed object types', ({ expect }) => {
    const result = hintFromIndexingResult({
      updated: 2,
      done: true,
      spaces: new Set([SpaceId.random()]),
      queues: new Set(),
      documents: new Set(),
      types: new Set([PERSON_DXN, `dxn:type:${ORG_TYPENAME}:0.1.0`]),
      objects: new Set(),
    });
    expect(result!.typenames).toEqual(new Set([PERSON_TYPENAME, ORG_TYPENAME]));
  });
});

describe('canonicalTypename', () => {
  test('strips schema version and the legacy `type:` kind segment', ({ expect }) => {
    expect(canonicalTypename(PERSON_DXN)).toBe(PERSON_TYPENAME);
    expect(canonicalTypename(`dxn:type:${PERSON_TYPENAME}:0.1.0`)).toBe(PERSON_TYPENAME);
    expect(canonicalTypename(`dxn:${PERSON_TYPENAME}`)).toBe(PERSON_TYPENAME);
  });

  test('passes through schema-as-object (EchoURI) and other non-type URIs unchanged', ({ expect }) => {
    // Dynamic schemas reference the schema object by EchoURI rather than a typename DXN.
    const echoUri = 'dxn:echo:B2NJDFNVZIW77OQSXUBNAD7BUMBD3G5PO:01JJRA86VK4H1TEB6QQVSWXP0E';
    expect(canonicalTypename(echoUri)).toBe(echoUri);
    // Arbitrary non-DXN strings are returned verbatim.
    expect(canonicalTypename('plain-string')).toBe('plain-string');
  });
});

// ---------------------------------------------------------------------------
// mergeHints — per-tick merger
// ---------------------------------------------------------------------------

describe('mergeHints', () => {
  test('unions constrained dimensions from both hints', ({ expect }) => {
    const s1 = SpaceId.random();
    const s2 = SpaceId.random();
    const merged = mergeHints(
      makeHint({ spaceIds: makeSpaceSet(s1), typenames: makeTypeSet('TypeA') }),
      makeHint({ spaceIds: makeSpaceSet(s2), typenames: makeTypeSet('TypeB') }),
    );
    expect(merged.spaceIds?.has(s1)).toBe(true);
    expect(merged.spaceIds?.has(s2)).toBe(true);
    expect(merged.typenames?.has('TypeA')).toBe(true);
    expect(merged.typenames?.has('TypeB')).toBe(true);
  });

  test('drops a dimension to unconstrained when either contributor is unconstrained', ({ expect }) => {
    const s = SpaceId.random();
    // b has no spaceIds → unconstrained on that dimension
    const merged = mergeHints(
      makeHint({ spaceIds: makeSpaceSet(s), typenames: makeTypeSet('TypeA') }),
      makeHint({ typenames: makeTypeSet('TypeB') }),
    );
    // Space is dropped because b is unconstrained on it.
    expect(merged.spaceIds).toBeUndefined();
    // Types are still unioned.
    expect(merged.typenames?.has('TypeA')).toBe(true);
    expect(merged.typenames?.has('TypeB')).toBe(true);
  });

  test('fully unconstrained result when one side has no constraints at all', ({ expect }) => {
    const merged = mergeHints(
      makeHint({}), // fully unconstrained
      makeHint({ spaceIds: makeSpaceSet(SpaceId.random()), typenames: makeTypeSet('TypeA') }),
    );
    expect(merged.spaceIds).toBeUndefined();
    expect(merged.typenames).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// QueryExecutor.matchesHint — typed queries
// ---------------------------------------------------------------------------

describe('QueryExecutor.matchesHint — typed query', () => {
  test('matches when hint typenames overlaps', ({ expect }) => {
    const executor = makeExecutor(withSpace(Query.select(Filter.type(TestSchema.Person))));
    expect(executor.matchesHint(makeHint({ typenames: makeTypeSet(PERSON_TYPENAME) }))).toBe(true);
  });

  test('does NOT match when hint typenames are disjoint', ({ expect }) => {
    const executor = makeExecutor(withSpace(Query.select(Filter.type(TestSchema.Person))));
    const hint = makeHint({
      spaceIds: makeSpaceSet(SPACE_ID),
      typenames: makeTypeSet(ORG_TYPENAME), // different type
    });
    expect(executor.matchesHint(hint)).toBe(false);
  });

  test('matches when hint has no typenames constraint (unconstrained → always match)', ({ expect }) => {
    const executor = makeExecutor(withSpace(Query.select(Filter.type(TestSchema.Person))));
    expect(executor.matchesHint(makeHint({ spaceIds: makeSpaceSet(SPACE_ID) }))).toBe(true);
  });

  test('does NOT match when hint spaceIds exclude this query space', ({ expect }) => {
    const executor = makeExecutor(withSpace(Query.select(Filter.type(TestSchema.Person))));
    const hint = makeHint({
      spaceIds: makeSpaceSet(SpaceId.random()),
      typenames: makeTypeSet(PERSON_TYPENAME),
    });
    expect(executor.matchesHint(hint)).toBe(false);
  });

  test('Filter.or(typeA, typeB) matches hint with only typeA', ({ expect }) => {
    const executor = makeExecutor(
      withSpace(Query.select(Filter.or(Filter.type(TestSchema.Organization), Filter.type(TestSchema.Person)))),
    );
    expect(
      executor.matchesHint(makeHint({ spaceIds: makeSpaceSet(SPACE_ID), typenames: makeTypeSet(PERSON_TYPENAME) })),
    ).toBe(true);
  });

  test('Filter.or(typeA, typeB) does NOT match hint with unrelated type', ({ expect }) => {
    const executor = makeExecutor(
      withSpace(Query.select(Filter.or(Filter.type(TestSchema.Organization), Filter.type(TestSchema.Person)))),
    );
    expect(
      executor.matchesHint(
        makeHint({ spaceIds: makeSpaceSet(SPACE_ID), typenames: makeTypeSet('com.example.unrelated') }),
      ),
    ).toBe(false);
  });

  // Regression for DX-966. The Composer navtree lists objects per type via `Filter.typename(...)`,
  // whose scope typename is version-less. It must match the canonical hint produced for a stored
  // (versioned) object so the reactive query is re-run on insert/delete. Both scope and hint are
  // reduced to the same canonical typename, so the comparison stays a plain set overlap — see
  // `canonicalTypename` and `hintFromIndexingResult` for the canonicalization at each boundary.
  test('version-less Filter.typename scope matches the canonical hint typename', ({ expect }) => {
    const executor = makeExecutor(withSpace(Query.select(Filter.typename(PERSON_TYPENAME))));
    expect(executor.matchesHint(makeHint({ typenames: makeTypeSet(PERSON_TYPENAME) }))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// QueryExecutor.matchesHint — complex / non-simple queries
// ---------------------------------------------------------------------------

describe('QueryExecutor.matchesHint — non-simple queries always match', () => {
  test('Filter.not(Filter.or(typeA, typeB)) query always matches (inverted TypeSelector → isSimple=false)', ({
    expect,
  }) => {
    const executor = makeExecutor(
      withSpace(
        Query.select(Filter.not(Filter.or(Filter.type(TestSchema.Organization), Filter.type(TestSchema.Person)))),
      ),
    );
    // Even a completely disjoint hint should match for non-simple queries.
    const hint = makeHint({
      spaceIds: makeSpaceSet(SpaceId.random()),
      typenames: makeTypeSet('dxn:totally.unrelated:0.1.0'),
    });
    expect(executor.matchesHint(hint)).toBe(true);
  });

  test('Union query (Query.all) always matches (UnionStep → isSimple=false)', ({ expect }) => {
    const executor = new QueryExecutor({
      indexEngine: {} as any,
      runtime: {} as any,
      automergeHost: {} as any,
      spaceStateManager: {} as any,
      queryId: 'test',
      query: Query.all(
        withSpace(Query.select(Filter.type(TestSchema.Person))),
        withSpace(Query.select(Filter.type(TestSchema.Organization))),
      ).ast,
      reactivity: 'reactive' as any,
    });
    const hint = makeHint({
      spaceIds: makeSpaceSet(SpaceId.random()),
      typenames: makeTypeSet('dxn:unrelated:0.1.0'),
    });
    expect(executor.matchesHint(hint)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// QueryExecutor.matchesHint — queue-scope derives spaceId
// ---------------------------------------------------------------------------

describe('QueryExecutor.matchesHint — queue scope derives spaceId', () => {
  test('queue-only scope derives spaceId and matches space-scoped hint', ({ expect }) => {
    const executor = new QueryExecutor({
      indexEngine: {} as any,
      runtime: {} as any,
      automergeHost: {} as any,
      spaceStateManager: {} as any,
      queryId: 'test',
      query: Query.select(Filter.type(TestSchema.Task)).from([{ _tag: 'feed' as const, feedUri: QUEUE_DXN }]).ast,
      reactivity: 'reactive' as any,
    });
    // Hint carries the space derived from the queue DXN → should match.
    const matchingHint = makeHint({ spaceIds: makeSpaceSet(QUEUE_SPACE_ID) });
    expect(executor.matchesHint(matchingHint)).toBe(true);

    // Hint from a different space → should not match.
    const nonMatchingHint = makeHint({ spaceIds: makeSpaceSet(SpaceId.random()) });
    expect(executor.matchesHint(nonMatchingHint)).toBe(false);
  });

  test('queue-only scope matches queue-scoped hint with the right queueId', ({ expect }) => {
    const executor = new QueryExecutor({
      indexEngine: {} as any,
      runtime: {} as any,
      automergeHost: {} as any,
      spaceStateManager: {} as any,
      queryId: 'test',
      query: Query.select(Filter.type(TestSchema.Task)).from([{ _tag: 'feed' as const, feedUri: QUEUE_DXN }]).ast,
      reactivity: 'reactive' as any,
    });
    // Hint constrained to the exact queue → match.
    const matchingHint = makeHint({ queueIds: makeObjectSet(QUEUE_ID) });
    expect(executor.matchesHint(matchingHint)).toBe(true);

    // Hint with a different queue → no match.
    const nonMatchingHint = makeHint({ queueIds: makeObjectSet(EntityId.random()) });
    expect(executor.matchesHint(nonMatchingHint)).toBe(false);
  });
});
