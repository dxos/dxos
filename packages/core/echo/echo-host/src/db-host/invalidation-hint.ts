//
// Copyright 2026 DXOS.org
//

import type { IndexingResult } from '@dxos/index-core';
import { DXN, type EntityId, type SpaceId } from '@dxos/keys';

export type InvalidationHint = {
  spaceIds?: ReadonlySet<SpaceId>;
  queueIds?: ReadonlySet<EntityId>;
  /**
   * Canonical typenames (version-less) — see {@link canonicalTypename}.
   * A type filter matches every version of a typename, so invalidation keys on the bare typename.
   * Query scopes are canonicalized the same way, so hints and scopes compare with a plain set overlap.
   */
  typenames?: ReadonlySet<string>;
  objectIds?: ReadonlySet<EntityId>;
};

/**
 * Reduces a type URI to the version-less typename used as the canonical key for invalidation
 * matching. Stored objects record a versioned `@type` (e.g. `dxn:foo:0.1.0`) while type filters
 * reference a typename without a version; both collapse to the same key here. Non-DXN URIs
 * (EchoURI schema references) have no version and pass through unchanged.
 */
export const canonicalTypename = (uri: string): string => {
  const dxn = DXN.tryMake(uri);
  return dxn != null ? DXN.getName(dxn) : uri;
};

/**
 * Converts an IndexingResult to an InvalidationHint.
 * Returns undefined when nothing was indexed (no need to invalidate).
 */
export const hintFromIndexingResult = (r: IndexingResult): InvalidationHint | undefined => {
  if (r.updated === 0) {
    return undefined;
  }
  return {
    spaceIds: r.spaces.size > 0 ? r.spaces : undefined,
    queueIds: r.queues.size > 0 ? r.queues : undefined,
    typenames: r.types.size > 0 ? new Set(Array.from(r.types, canonicalTypename)) : undefined,
    objectIds: r.objects.size > 0 ? r.objects : undefined,
  };
};

/**
 * Merges two hints for the same tick.
 * If either side leaves a dimension unconstrained (undefined), the merged result is also unconstrained on that dimension.
 */
export const mergeHints = (a: InvalidationHint, b: InvalidationHint): InvalidationHint => ({
  spaceIds: unionOrUndefined(a.spaceIds, b.spaceIds),
  queueIds: unionOrUndefined(a.queueIds, b.queueIds),
  typenames: unionOrUndefined(a.typenames, b.typenames),
  objectIds: unionOrUndefined(a.objectIds, b.objectIds),
});

const unionOrUndefined = <T>(
  a: ReadonlySet<T> | undefined,
  b: ReadonlySet<T> | undefined,
): ReadonlySet<T> | undefined => {
  if (a === undefined || b === undefined) {
    return undefined;
  }
  return new Set<T>([...a, ...b]);
};
