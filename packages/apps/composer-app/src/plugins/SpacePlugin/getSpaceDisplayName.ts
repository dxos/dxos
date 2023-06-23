//
// Copyright 2023 DXOS.org
//

import { Space, SpaceState } from '@dxos/client';

export const getSpaceDisplayName = (space: Space): string | [string, { ns: string }] => {
  const disabled = space.state.get() !== SpaceState.READY;
  return (space.properties.name?.length ?? 0) > 0
    ? space.properties.name
    : disabled
    ? ['loading space title', { ns: 'composer' }]
    : ['untitled space title', { ns: 'composer' }];
};
