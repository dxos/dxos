//
// Copyright 2025 DXOS.org
//

import { type Space } from '@dxos/client/echo';
import { Obj } from '@dxos/echo';

/** Space tag for the personal space. */
export const PERSONAL_SPACE_TAG = 'org.dxos.space.personal';

// TODO(wittjosiah): Remove once all profiles have tagged personal spaces (tags cannot be added retroactively).
const DEFAULT_SPACE_KEY = '__DEFAULT__';

/** Check if a space has a specific tag. */
export const hasTag = (space: Pick<Space, 'tags'>, tag: string): boolean => space.tags.includes(tag);

/** Check if a space is the personal space. */
export const isPersonalSpace = (space: Pick<Space, 'tags' | 'properties'>): boolean => {
  if (hasTag(space, PERSONAL_SPACE_TAG)) {
    return true;
  }

  // TODO(wittjosiah): Remove once all profiles have tagged personal spaces (tags cannot be added retroactively).
  try {
    return space.properties[DEFAULT_SPACE_KEY] === true;
  } catch {
    return false;
  }
};

/**
 * Mark a space as the personal space via legacy property.
 * @deprecated Use `tags: [PERSONAL_SPACE_TAG]` when creating the space instead.
 * TODO(wittjosiah): Remove once all profiles have tagged personal spaces (tags cannot be added retroactively).
 */
export const setPersonalSpace = (space: Space): void => {
  Obj.update(space.properties, (properties) => {
    (properties as any)[DEFAULT_SPACE_KEY] = true;
  });
};

/** Find the personal space. */
export const getPersonalSpace = (client: { spaces: { get(): Space[] } }): Space | undefined =>
  client.spaces.get().find((space) => isPersonalSpace(space));

/**
 * Find the personal space, falling back to the legacy `DefaultSpace` HALO credential for profiles
 * that predate immutable space tags.
 *
 * Returns `{ space, fromCredential }` where `fromCredential: true` means the space was found via
 * the old credential and `setPersonalSpace` should be called once the space is ready to persist
 * the `__DEFAULT__` marker for future loads.
 *
 * TODO(wittjosiah): Remove once all profiles have tagged personal spaces (tags cannot be added retroactively).
 */
export const resolvePersonalSpace = (client: {
  spaces: { get(): Space[]; get(id: any): Space | undefined };
  halo: { queryCredentials(options: { type: string }): any[] };
}): { space: Space; fromCredential: boolean } | undefined => {
  const found = getPersonalSpace(client);
  if (found) {
    return { space: found, fromCredential: false };
  }

  const defaultSpaceCredential = client.halo.queryCredentials({
    type: 'dxos.halo.credentials.DefaultSpace',
  })[0];
  if (!defaultSpaceCredential) {
    return undefined;
  }

  const defaultSpaceId = defaultSpaceCredential?.subject?.assertion?.spaceId;
  if (typeof defaultSpaceId !== 'string') {
    return undefined;
  }
  const space = client.spaces.get(defaultSpaceId);
  return space ? { space, fromCredential: true } : undefined;
};
