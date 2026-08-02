//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { type ForeignKey, PROPERTY_ID } from '@dxos/echo-protocol';
import { type EntityId } from '@dxos/keys';

import type * as Entity from './Entity';
import * as Obj from './Obj';

//
// Natural key
//

/**
 * Read the natural key an entity declares, if any.
 *
 * The natural key is a caller-supplied domain identity, unique within a space: two entities
 * carrying the same natural key are the same entity and converge to one via {@link merge}.
 * It sits alongside the entity's id, which is a surrogate — system-minted, random, and
 * meaningless outside the database.
 */
export const getNaturalKey = (entity: Entity.Unknown | Entity.Snapshot): string | undefined =>
  Obj.getMeta(entity as any).naturalKey;

/**
 * Declare an entity's natural key, or clear it when passed `undefined`.
 *
 * Objects only: relations and types are not merge subjects yet — merging a relation would
 * tombstone it without reconciling its endpoints, and merging a type would break schema
 * resolution for its instances.
 *
 * @throws On a non-object entity, or an empty-string key (which would group unrelated entities).
 */
export const setNaturalKey = (entity: Entity.Unknown, naturalKey: string | undefined): void => {
  if (!Obj.isObject(entity)) {
    throw new TypeError('Natural keys are limited to objects; relations and types are not merge subjects.');
  }
  if (naturalKey !== undefined && naturalKey.length === 0) {
    throw new TypeError('Natural key must be a non-empty string.');
  }
  Obj.update(entity, (entity) => {
    Obj.getMeta(entity).naturalKey = naturalKey;
  });
};

//
// Candidates
//

/**
 * Storage-independent view of one entity participating in a merge.
 *
 * The merge core is defined over these rather than over live objects so that winner selection
 * and the merge function stay pure and testable without a database.
 */
export type Candidate = {
  readonly id: EntityId;

  /** The declared natural key; candidates in one merge group all share it. */
  readonly naturalKey?: string;

  /** User-defined data. A property present with value `undefined` counts as undefined. */
  readonly data: Readonly<Record<string, unknown>>;

  /** Foreign keys, unioned across the group by {@link merge}. */
  readonly keys?: readonly ForeignKey[];
};

// ECHO's brand keys (`KindId` and friends) are ordinary string properties rather than symbols, so
// they show up in `Object.entries` of a snapshot. They are not user data, and writing one back to
// an object throws, so they have to be excluded by prefix.
const INTERNAL_KEY_PREFIX = '~@dxos/echo/';

const isDataField = (field: string): boolean => field !== PROPERTY_ID && !field.startsWith(INTERNAL_KEY_PREFIX);

/**
 * Build a {@link Candidate} from a live entity or snapshot.
 */
export const candidateOf = (entity: Entity.Unknown | Entity.Snapshot): Candidate => {
  const meta = Obj.getMeta(entity as any);
  const snapshot = Obj.getSnapshot(entity as any) as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  for (const [field, value] of Object.entries(snapshot)) {
    if (isDataField(field)) {
      data[field] = value;
    }
  }

  return {
    id: (entity as { id: EntityId }).id,
    naturalKey: meta.naturalKey,
    data,
    keys: meta.keys,
  };
};

//
// Winner selection
//

/**
 * The winner of a merge group: the minimum id.
 *
 * Ids are ULIDs, so this is also the earliest-created entity. Being a pure function of the id
 * set, it is stable under permutation and agreed on by every peer that sees the same set — and
 * because it is a minimum, a peer seeing a superset picks an id no larger than a peer seeing a
 * subset, which is what makes redirect chains terminate (see {@link resolveRedirect}).
 */
export const selectWinner = (candidates: readonly Candidate[]): EntityId | undefined =>
  candidates.reduce<EntityId | undefined>(
    (winner, candidate) => (winner === undefined || candidate.id < winner ? candidate.id : winner),
    undefined,
  );

/**
 * Partition entities into merge groups by natural key.
 *
 * Entities that declare no natural key are not merge candidates and are omitted. Groups are
 * returned regardless of size; a group of one is a no-op for {@link merge}.
 */
export const groupByNaturalKey = (candidates: readonly Candidate[]): Map<string, Candidate[]> => {
  const groups = new Map<string, Candidate[]>();
  for (const candidate of candidates) {
    if (candidate.naturalKey === undefined) {
      continue;
    }
    const group = groups.get(candidate.naturalKey);
    if (group) {
      group.push(candidate);
    } else {
      groups.set(candidate.naturalKey, [candidate]);
    }
  }
  return groups;
};

/**
 * Groups holding more than one entity — i.e. the ones that actually need merging.
 */
export const findDuplicates = (candidates: readonly Candidate[]): Map<string, Candidate[]> => {
  const groups = groupByNaturalKey(candidates);
  for (const [naturalKey, group] of groups) {
    if (group.length < 2) {
      groups.delete(naturalKey);
    }
  }
  return groups;
};

//
// Merge
//

export type MergeResult = {
  /** The surviving entity. */
  readonly winner: EntityId;

  /** Entities to redirect at the winner and tombstone, ascending by id. */
  readonly losers: readonly EntityId[];

  /** Field-wise merged data, to be written to the winner as per-field writes. */
  readonly data: Record<string, unknown>;

  /** Union of every candidate's foreign keys, deduplicated and deterministically ordered. */
  readonly keys: ForeignKey[];
};

const compareForeignKeys = (a: ForeignKey, b: ForeignKey): number =>
  a.source === b.source ? (a.id < b.id ? -1 : a.id > b.id ? 1 : 0) : a.source < b.source ? -1 : 1;

/**
 * Merge a group of duplicates into a single deterministic result.
 *
 * The result is a pure function of the candidate **set**: for each field, the value comes from
 * the smallest-id candidate that defines it. This is deliberately not a pairwise fold —
 * pairwise winner-preference is not associative, so different application orders would diverge
 * (for ids `Z < X < Y` where `Z` lacks field `a`, merging `X` then `Y` into `Z` yields a
 * different `a` than `Y` then `X`). Computing over the whole set at once is
 * permutation-independent by construction.
 *
 * Peers holding different candidate sets can still transiently compute different results; they
 * reconverge because losers are retained, so a later pass recomputes over the union.
 *
 * @throws If given no candidates.
 */
export const merge = (candidates: readonly Candidate[]): MergeResult => {
  if (candidates.length === 0) {
    throw new TypeError('Cannot merge an empty candidate set.');
  }

  // Deduplicate by id first: a caller may pass the same entity twice (query results are not unique
  // until presentation), and without this the repeat becomes a loser pointing at itself, which
  // would tombstone the winner.
  const byId = new Map<EntityId, Candidate>();
  for (const candidate of candidates) {
    if (!byId.has(candidate.id)) {
      byId.set(candidate.id, candidate);
    }
  }

  // Ascending by id, so the first candidate defining a field is the smallest-id one that does.
  const ordered = [...byId.values()].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const [winner, ...losers] = ordered;

  const data: Record<string, unknown> = {};
  for (const candidate of ordered) {
    for (const [field, value] of Object.entries(candidate.data)) {
      if (value !== undefined && !(field in data)) {
        data[field] = value;
      }
    }
  }

  const keys: ForeignKey[] = [];
  for (const candidate of ordered) {
    for (const key of candidate.keys ?? []) {
      if (!keys.some((existing) => existing.source === key.source && existing.id === key.id)) {
        keys.push(key);
      }
    }
  }
  keys.sort(compareForeignKeys);

  return { winner: winner.id, losers: losers.map(({ id }) => id), data, keys };
};

//
// Redirects
//

/**
 * Follow `system.mergedInto` from `start` to the entity that finally survives.
 *
 * Concurrent merges on different views leave chains rather than a single hop: a peer seeing
 * `{X, Y}` writes `Y -> X` while a peer that also sees a smaller `Z` writes `X -> Z`, so `Y`
 * reaches `Z` only transitively.
 *
 * Termination does not rely on the id-decreasing invariant holding in the data: an edge that
 * fails to decrease the id is treated as the end of the chain, which stops both cycles and
 * forward references without reading unbounded history.
 *
 * @param lookup Returns the `mergedInto` of an entity, or `undefined` if it was not merged away.
 */
export const resolveRedirect = (start: EntityId, lookup: (id: EntityId) => EntityId | undefined): EntityId => {
  let current = start;
  for (;;) {
    const next = lookup(current);
    if (next === undefined || next >= current) {
      return current;
    }
    current = next;
  }
};
