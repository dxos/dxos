//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { useConfig } from '@dxos/react-client';
import { type Space } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { StackItem } from '@dxos/react-ui-stack';

import { Calls } from './Calls';

const CallsContainer = ({ space, role }: { space: Space; role?: string }) => {
  if (!space) {
    return null;
  }

  const config = useConfig();
  const identity = useIdentity();

  return (
    <StackItem.Content toolbar={false}>
      <Calls
        username={identity?.profile?.displayName ?? 'No Name'}
        roomId={space.key}
        iceServers={config.get('runtime.services.ice') ?? []}
      />
    </StackItem.Content>
  );
};

export default CallsContainer;
