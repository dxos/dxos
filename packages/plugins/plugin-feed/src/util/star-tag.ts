//
// Copyright 2026 DXOS.org
//

import { useMemo } from 'react';

import { type Database, Filter, Obj, Tag } from '@dxos/echo';
import { useQuery } from '@dxos/react-client/echo';

import { Subscription } from '../types';

// TODO(burdon): Factor out.

/**
 * Returns the canonical "starred" {@link Tag.Tag} object for the given database, if one exists.
 * Reactively updates when a matching tag is added or removed from the space.
 */
export const useStarTag = (db?: Database.Database): Tag.Tag | undefined => {
  const tags = useQuery(db, Filter.type(Tag.Tag));
  return useMemo(() => tags.find((tag) => tag.label === Subscription.STAR_TAG), [tags]);
};

/** Finds an existing starred tag in the database, returning undefined if none exists. */
export const findStarTag = (db: Database.Database): Tag.Tag | undefined => {
  const existing = db.query(Filter.type(Tag.Tag)).runSync();
  return existing.find((tag) => tag.label === Subscription.STAR_TAG);
};

/** Finds an existing starred tag in the database, creating one if necessary. */
export const ensureStarTag = (db: Database.Database): Tag.Tag => {
  const found = findStarTag(db);
  if (found) {
    return found;
  }
  return db.add(Tag.make({ label: Subscription.STAR_TAG }));
};

/** Checks whether the given object's meta tags include the supplied tag. */
export const hasMetaTag = (object: Obj.Unknown, tag: Tag.Tag | undefined): boolean => {
  if (!tag) {
    return false;
  }
  const dxn = Obj.getDXN(tag).toString();
  return Obj.getMeta(object).tags?.includes(dxn) ?? false;
};

/** Toggles the supplied tag in the object's meta tags. */
export const toggleMetaTag = (object: Obj.Unknown, tag: Tag.Tag): void => {
  const dxn = Obj.getDXN(tag).toString();
  Obj.change(object, (object) => {
    const meta = Obj.getMeta(object);
    const current = meta.tags ?? [];
    meta.tags = current.includes(dxn) ? current.filter((value) => value !== dxn) : [...current, dxn];
  });
};
