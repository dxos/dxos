//
// Copyright 2026 DXOS.org
//

import { type ForeignKey } from '@dxos/echo-protocol';
import { type EntityId } from '@dxos/keys';

/**
 * Storage-independent view of one entity participating in a merge.
 *
 * The merge core is defined over these rather than over live objects so that winner selection
 * and the merge function stay pure and testable without a database.
 */
export type MergeCandidate = {
  readonly id: EntityId;

  /** The declared convergence key; candidates in one merge group all share it. */
  readonly convergenceKey?: string;

  /** User-defined data. A property present with value `undefined` counts as undefined. */
  readonly data: Readonly<Record<string, unknown>>;

  /** Foreign keys, unioned across the group by {@link mergeCandidates}. */
  readonly keys?: readonly ForeignKey[];
};

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
 * The winner is the minimum id. Ids are ULIDs, so this is also the earliest-created entity —
 * and, being a pure function of the id set, it is agreed on by every peer that sees the same
 * set. Because it is a minimum, a peer seeing a superset picks an id no larger than a peer
 * seeing a subset, which is what makes redirect chains terminate (see `resolveMergeRedirect`
 * in `@dxos/echo/internal`).
 *
 * The result is a pure function of the candidate **set**: for each field, the value comes from
 * the smallest-id candidate that defines it. This is deliberately not a pairwise fold —
 * pairwise winner-preference is not associative, so different application orders would diverge
 * (for ids `Z < X < Y` where `Z` lacks field `a`, merging `X` then `Y` into `Z` yields a
 * different `a` than `Y` then `X`). Computing over the whole set at once is
 * permutation-independent by construction.
 *
 * Peers holding different candidate sets can still transiently compute different results. They
 * reconverge because losers are retained as redirects: a later pass follows a tombstoned loser's
 * chain to the live end and folds its remaining state there. That guarantees *agreement* — every
 * peer ends at the same winner with the same fields — but not that the final value of every field
 * equals what this function would return over the union: once an entity is tombstoned it never
 * re-enters the field-wise merge, so a fold can carry a field onto a winner that had defined it.
 * Likewise, folds run by different peers race as ordinary register writes on the winner —
 * resolved deterministically, so agreement still holds, but sequential straggler edits observed
 * by different folders can resolve to the earlier value.
 *
 * @throws If given no candidates.
 */
export const mergeCandidates = (candidates: readonly MergeCandidate[]): MergeResult => {
  if (candidates.length === 0) {
    throw new TypeError('Cannot merge an empty candidate set.');
  }

  // Deduplicate by id first: a caller may pass the same entity twice (query results are not unique
  // until presentation), and without this the repeat becomes a loser pointing at itself, which
  // would tombstone the winner.
  const byId = new Map<EntityId, MergeCandidate>();
  for (const candidate of candidates) {
    if (!byId.has(candidate.id)) {
      byId.set(candidate.id, candidate);
    }
  }

  // Ascending by id, so the first candidate defining a field is the smallest-id one that does.
  const ordered = [...byId.values()].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const [winner, ...losers] = ordered;

  // Accumulate in a Map: on a plain object, `field in data` would see `Object.prototype`
  // members (`toString`, `__proto__`, ...) as already present and silently drop those fields.
  const data = new Map<string, unknown>();
  for (const candidate of ordered) {
    for (const [field, value] of Object.entries(candidate.data)) {
      if (value !== undefined && !data.has(field)) {
        data.set(field, value);
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

  return { winner: winner.id, losers: losers.map(({ id }) => id), data: Object.fromEntries(data), keys };
};
