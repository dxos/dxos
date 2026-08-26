//
// Copyright 2026 DXOS.org
//

import { useMemo } from 'react';

import { type Database, Filter, Obj, Tag } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { type Shortcut, findFavoriteTag, toShortcuts } from '@dxos/plugin-space/dashboard';

/**
 * Live shortcuts for the space's favorites.
 *
 * Only the panel needs this: the headless driver reads the same facts off the dashboard capability,
 * which already owns the queries.
 */
export const useFavorites = (db: Database.Queryable | undefined, slots: number): (Shortcut | null)[] => {
  const tags = useQuery(db, Filter.type(Tag.Tag));
  const tag = useMemo(() => findFavoriteTag(tags), [tags]);
  const objects = useQuery(db, tag ? Filter.tag(Obj.getURI(tag)) : Filter.nothing());
  return useMemo(() => toShortcuts(objects, slots), [objects, slots]);
};
