//
// Copyright 2025 DXOS.org
//

import { type Space } from '@dxos/client/echo';

/** Space tag for the personal space. */
export const PERSONAL_SPACE_TAG = 'org.dxos.space.personal';

/** Check if a space has a specific tag. */
export const hasTag = (space: Pick<Space, 'tags'>, tag: string): boolean => space.tags.includes(tag);

/** Check if a space is the personal space. */
export const isPersonalSpace = (space: Pick<Space, 'tags'>): boolean => hasTag(space, PERSONAL_SPACE_TAG);

/** Find the personal space. */
export const getPersonalSpace = (client: { spaces: { get(): Space[] } }): Space | undefined =>
  client.spaces.get().find((space) => isPersonalSpace(space));
