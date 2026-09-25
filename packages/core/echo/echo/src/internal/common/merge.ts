//
// Copyright 2026 DXOS.org
//

import { type EntityId } from '@dxos/keys';

/**
 * Follow `system.mergedInto` from `start` to the entity that finally survives.
 *
 * This is the one piece of the convergence-key merge the client needs: resolution and the
 * transitive-deletion walks follow redirects, while the merge itself (winner selection, the
 * field-wise merge function) runs in the worker — see `echo-host`'s merge core.
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
export const resolveMergeRedirect = (start: EntityId, lookup: (id: EntityId) => EntityId | undefined): EntityId => {
  let current = start;
  for (;;) {
    const next = lookup(current);
    if (next === undefined || next >= current) {
      return current;
    }
    current = next;
  }
};
