//
// Copyright 2026 DXOS.org
//

import { useMemo } from 'react';

import { type Database, Filter, Obj, Tag } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';

import { type KeySpec } from './types';

/**
 * Label of the canonical tag marking an object as a favorite. ECHO tags are first-class
 * (`Obj.getMeta(obj).tags`, `Obj.addTag`, `Filter.tag`), so no new annotation is introduced.
 */
export const FAVORITE_TAG = 'favorite';

const DEFAULT_ICON = 'ph--cube--regular';

/**
 * Projects favorites onto a fixed number of key slots.
 *
 * Phase 1 assigns slots from a stable sort rather than persisting positions, so adding a favorite
 * can reshuffle the keys under the user's fingers; a `StreamDeckLayout` object fixes that later.
 * Kept pure so the mapping is testable without a device or a live query.
 */
export const toKeySpecs = (objects: readonly Obj.Unknown[], slots: number): (KeySpec | null)[] => {
  const specs = objects
    .map((object): KeySpec => {
      const icon = Obj.getIcon(object);
      return {
        target: Obj.getURI(object),
        label: Obj.getLabel(object, { fallback: 'typename' }) ?? 'Object',
        icon: icon?.icon ?? DEFAULT_ICON,
        hue: icon?.hue,
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label) || a.target.localeCompare(b.target));

  return Array.from({ length: slots }, (_, index) => specs[index] ?? null);
};

/**
 * The space's `favorite` tag, if it exists. `Filter.tag` matches a tag's URI rather than its label,
 * so the tag object has to be resolved before favorites can be queried. Keyless tags only: a
 * provider tag that happens to be labelled "favorite" is somebody else's tag.
 */
export const findFavoriteTag = (tags: readonly Tag.Tag[]): Tag.Tag | undefined =>
  tags.find((tag) => tag.label.toLowerCase() === FAVORITE_TAG && (Obj.getMeta(tag).keys ?? []).length === 0);

/** Live key specs for the space's favorites. */
export const useFavorites = (db: Database.Queryable | undefined, slots: number): (KeySpec | null)[] => {
  const tags = useQuery(db, Filter.type(Tag.Tag));
  const tag = useMemo(() => findFavoriteTag(tags), [tags]);
  const objects = useQuery(db, tag ? Filter.tag(Obj.getURI(tag)) : Filter.nothing());
  return useMemo(() => toKeySpecs(objects, slots), [objects, slots]);
};
