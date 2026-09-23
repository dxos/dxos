//
// Copyright 2026 DXOS.org
//

import { EID, type SpaceId } from '@dxos/keys';

/**
 * Bare entity id of a reference that is local to `spaceId`; `null` for a cross-space reference,
 * a non-entity URI, or no reference. Feeds `objectMeta.parentId`/`sourceId`/`targetId`.
 *
 * Lives outside the index so the backfill migration derives the columns by the same rule the
 * indexing pass does, rather than restating it in SQL.
 */
export const localEntityId = (uri: unknown, spaceId: SpaceId): string | null => {
  if (typeof uri !== 'string') {
    return null;
  }
  const eid = EID.tryParse(uri);
  if (!eid) {
    return null;
  }
  const referencedSpaceId = EID.getSpaceId(eid);
  if (referencedSpaceId !== undefined && referencedSpaceId !== spaceId) {
    return null;
  }
  return EID.getEntityId(eid) ?? null;
};
