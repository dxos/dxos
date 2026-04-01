//
// Copyright 2025 DXOS.org
//

import { type Space } from '@dxos/client/echo';
import { Obj } from '@dxos/echo';

// TODO(DX-891): Remove legacy fallback once all existing personal spaces have been migrated.

/** Space properties key for personal space metadata (legacy). */
const DEFAULT_SPACE_KEY = '__DEFAULT__';

/** Check if a space has a specific tag. */
export const hasTag = (space: Pick<Space, 'tags'>, tag: string): boolean => space.tags.includes(tag);

/** Check if a space is the personal space. */
export const isPersonalSpace = (space: Pick<Space, 'tags' | 'properties'>): boolean => {
  if (hasTag(space, 'personal')) {
    return true;
  }

  // Legacy fallback: check space properties (requires space to be initialized).
  try {
    return space.properties[DEFAULT_SPACE_KEY] === true;
  } catch {
    return false;
  }
};

/**
 * Mark a space as the personal space.
 * @deprecated Use `tags: ['personal']` when creating the space instead.
 */
export const setPersonalSpace = (space: Space): void => {
  Obj.change(space.properties, (properties) => {
    (properties as any)[DEFAULT_SPACE_KEY] = true;
  });
};

/** Find the personal space. */
export const getPersonalSpace = (client: { spaces: { get(): Space[] } }): Space | undefined =>
  client.spaces.get().find((space) => isPersonalSpace(space));
