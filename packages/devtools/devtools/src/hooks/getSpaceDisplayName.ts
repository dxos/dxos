//
// Copyright 2026 DXOS.org
//

import { type Space, SpaceState } from '@dxos/react-client/echo';

// TODO(wittjosiah): Factor out (copied from plugin-space).
export const getSpaceDisplayName = (space: Space): string => {
  const name = space.state.get() === SpaceState.SPACE_READY ? space.properties.name : undefined;
  return name && name.length > 0 ? name : 'New space';
};
