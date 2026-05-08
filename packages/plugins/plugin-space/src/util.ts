//
// Copyright 2023 DXOS.org
//

import { type Space, SpaceState } from '@dxos/client/echo';
import { type Label } from '@dxos/ui-types/translations';

import { meta } from '#meta';

//
// Constants
//

const PERSONAL_SPACE_LABEL: Label = ['personal-space.label', { ns: meta.id }];
const UNNAMED_SPACE_LABEL: Label = ['unnamed-space.label', { ns: meta.id }];

export const SPACES = `${meta.id}-spaces`;
export { SHARED } from './types';

//
// Helpers
//

/** Returns the display label for a space (name, namesCache entry, or fallback). */
export const getSpaceDisplayName = (
  space: Space,
  { personal, namesCache = {} }: { personal?: boolean; namesCache?: Record<string, string> } = {},
): Label => {
  return space.state.get() === SpaceState.SPACE_READY && (space.properties.name?.length ?? 0) > 0
    ? space.properties.name!
    : namesCache[space.id]
      ? namesCache[space.id]
      : personal
        ? PERSONAL_SPACE_LABEL
        : UNNAMED_SPACE_LABEL;
};
