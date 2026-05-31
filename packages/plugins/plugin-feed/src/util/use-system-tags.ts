//
// Copyright 2026 DXOS.org
//

import { useMemo } from 'react';

import { type Database, Filter, Obj, Tag } from '@dxos/echo';
import { useQuery } from '@dxos/react-client/echo';

import { Subscription } from '../types';

/**
 * Resolves the uris of the `starred` / `archived` system {@link Tag} objects (if they exist yet) so
 * synchronous render/filter code can test membership via {@link hasTag}. Reactive: the uris appear
 * once the Tag objects are created (by the first star/archive action).
 */
export const useSystemTags = (
  db: Database.Database | undefined,
): { starredUri: string | undefined; archivedUri: string | undefined } => {
  const tags = useQuery(db, Filter.type(Tag.Tag));
  return useMemo(() => {
    const uriFor = (key: { source: string; id: string }) => {
      const match = tags.find((tag) => Obj.getKeys(tag, key.source).some((foreignKey) => foreignKey.id === key.id));
      return match ? Obj.getURI(match).toString() : undefined;
    };
    return { starredUri: uriFor(Subscription.STARRED_TAG), archivedUri: uriFor(Subscription.ARCHIVED_TAG) };
  }, [tags]);
};
