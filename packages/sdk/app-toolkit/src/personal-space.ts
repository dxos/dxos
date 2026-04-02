//
// Copyright 2025 DXOS.org
//

import { type Space } from '@dxos/client/echo';
import { Obj } from '@dxos/echo';

// TODO: Replace with space tags when available.

/** Space properties key for personal space metadata. */
const DEFAULT_SPACE_KEY = '__DEFAULT__';

/** Check if a space is the personal space. */
export const isPersonalSpace = (space: Space): boolean => space.properties[DEFAULT_SPACE_KEY] === true;

/** Mark a space as the personal space. */
export const setPersonalSpace = (space: Space): void => {
  Obj.change(space.properties, (properties) => {
    (properties as any)[DEFAULT_SPACE_KEY] = true;
  });
};

/** Find the personal space. */
export const getPersonalSpace = (client: { spaces: { get(): Space[] } }): Space | undefined =>
  client.spaces.get().find(isPersonalSpace);
