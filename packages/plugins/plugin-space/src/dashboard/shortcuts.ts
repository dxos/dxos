//
// Copyright 2026 DXOS.org
//

import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import { Obj, type Tag } from '@dxos/echo';

import { toSlots } from './slots.ts';
import { type Shortcut } from './types.ts';

/**
 * Label of the canonical tag marking an object as a favorite. ECHO tags are first-class
 * (`Obj.getMeta(obj).tags`, `Obj.addTag`, `Filter.tag`), so no new annotation is introduced.
 */
export const FAVORITE_TAG = 'favorite';

const DEFAULT_ICON = 'ph--cube--regular';

/**
 * Projects favorites onto a fixed number of slots.
 *
 * Slots are assigned from a stable sort rather than persisted positions, so adding a favorite can
 * reshuffle them under the user's fingers; a persisted layout object fixes that later. Kept pure so
 * the mapping is testable without a device or a live query.
 */
export const toShortcuts = (objects: readonly Obj.Unknown[], slots: number): (Shortcut | null)[] => {
  const specs = objects
    .flatMap((object): Shortcut[] => {
      // An object with no database or no type URI has no navigation path, so a slot for it could not
      // open anything; drop it rather than surfacing a dead slot.
      let target: string;
      try {
        target = GraphPath.getObjectPathFromObject(object);
      } catch {
        return [];
      }
      const icon = Obj.getIcon(object);
      return [
        {
          target,
          label: Obj.getLabel(object, { fallback: 'typename' }) ?? 'Object',
          icon: icon?.icon ?? DEFAULT_ICON,
          hue: icon?.hue,
        },
      ];
    })
    .sort((a, b) => a.label.localeCompare(b.label) || a.target.localeCompare(b.target));

  return toSlots(specs, slots);
};

/**
 * The space's `favorite` tag, if it exists. `Filter.tag` matches a tag's URI rather than its label,
 * so the tag object has to be resolved before favorites can be queried. Keyless tags only: a
 * provider tag that happens to be labelled "favorite" is somebody else's tag.
 */
export const findFavoriteTag = (tags: readonly Tag.Tag[]): Tag.Tag | undefined =>
  tags.find((tag) => tag.label.toLowerCase() === FAVORITE_TAG && (Obj.getMeta(tag).keys ?? []).length === 0);
