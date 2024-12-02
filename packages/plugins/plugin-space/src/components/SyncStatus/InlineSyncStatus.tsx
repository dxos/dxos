//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { useClient } from '@dxos/react-client';
import { type Space } from '@dxos/react-client/echo';
import { Icon } from '@dxos/react-ui';

import { useSpaceSyncState } from './sync-state';

export const InlineSyncStatus = ({ space }: { space: Space }) => {
  const client = useClient();
  // TODO(wittjosiah): Actually check this.
  const connectedToEdge = !!client;
  const syncState = useSpaceSyncState(space);
  if (!connectedToEdge || !syncState || syncState.missingOnLocal === 0) {
    return null;
  }

  return (
    <div role='none' className='flex items-center'>
      <Icon icon='ph--arrows-clockwise--regular' size={3} classNames='animate-spin' />
    </div>
  );
};
