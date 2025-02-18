//
// Copyright 2024 DXOS.org
//

import React, { type FC } from 'react';

import { useConfig } from '@dxos/react-client';
import { type Space } from '@dxos/react-client/echo';
import { StackItem } from '@dxos/react-ui-stack';

import { Calls } from './Calls';

const CallsContainer: FC<{ space: Space; role?: string }> = ({ space }) => {
  const config = useConfig();
  if (!space) {
    return null;
  }

  return (
    <StackItem.Content toolbar={false}>
      <Calls
        space={space}
        // TODO(mykola): Conflicts with the space swarm topic. Derive key from space key?
        roomId={space.key}
        iceServers={config.get('runtime.services.ice') ?? []}
      />
    </StackItem.Content>
  );
};

export default CallsContainer;
