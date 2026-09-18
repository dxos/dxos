//
// Copyright 2026 DXOS.org
//

/** Ids named in {@link QueryIncompleteError}'s message, enough to act on without unbounded growth. */
const MAX_REPORTED_UNRESOLVED_HITS = 5;

/**
 * An index hit a query source could not turn into an object, and could not rule out that the object
 * is there — a hit the source positively established is gone is a stale index entry, dropped rather
 * than reported. Another source may still hold the object, which is why only the merged result
 * decides whether it is missing.
 */
export type UnresolvedHit = {
  id: string;
  spaceId: string;
  reason: 'load-timeout' | 'schema-invalid';
};

/**
 * A one-shot query that would have under-returned: objects the index matched reached no source, and
 * a one-shot caller gets no second pass to fix that, so a short result would read as the whole set.
 */
export class QueryIncompleteError extends Error {
  constructor(readonly unresolved: readonly UnresolvedHit[]) {
    super(
      `Query result is incomplete: ${unresolved.length} of the index hits did not load (${unresolved
        .slice(0, MAX_REPORTED_UNRESOLVED_HITS)
        .map((hit) => `${hit.id}: ${hit.reason}`)
        .join(', ')}${unresolved.length > MAX_REPORTED_UNRESOLVED_HITS ? ', …' : ''}).`,
    );
    this.name = 'QueryIncompleteError';
  }
}
