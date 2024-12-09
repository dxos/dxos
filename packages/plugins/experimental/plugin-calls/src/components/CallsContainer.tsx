//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { useConfig } from '@dxos/react-client';
import { type Space } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';

import { Calls } from './Calls';

const CallsContainer = ({ space, role }: { space: Space; role?: string }) => {
  if (!space) {
    return null;
  }

  const config = useConfig();
  const identity = useIdentity();

  return (
    <div role='none' className='flex flex-col row-span-2 is-full overflow-hidden'>
      <Calls
        username={identity?.profile?.displayName ?? 'No Name'}
        roomName={space.id.slice(10)}
        iceServers={config.get('runtime.services.ice') ?? []}
      />
    </div>
  );
};

export default CallsContainer;
