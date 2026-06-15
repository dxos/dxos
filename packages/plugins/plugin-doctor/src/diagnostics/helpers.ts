//
// Copyright 2026 DXOS.org
//

import type { Client } from '@dxos/client';
import { SpaceState, type Space } from '@dxos/client/echo';
import { Filter, Obj, Query } from '@dxos/echo';

/**
 * Return all spaces that are ready to be queried.
 */
export const getReadySpaces = (client: Client): Space[] =>
  client.spaces.get().filter((space) => space.state.get() === SpaceState.SPACE_READY);

/**
 * Run a query for every object in a space.
 */
export const queryAllObjects = async (space: Space): Promise<Obj.Unknown[]> => {
  const objects = await space.db.query(Query.select(Filter.everything())).run();
  return objects as Obj.Unknown[];
};

/**
 * Best-effort label for an object (typename + short id).
 */
export const labelObject = (obj: Obj.Unknown): string => {
  const typename = Obj.getTypename(obj) ?? 'unknown';
  return `${typename}:${String((obj as { id?: string }).id ?? '?').slice(0, 8)}`;
};
