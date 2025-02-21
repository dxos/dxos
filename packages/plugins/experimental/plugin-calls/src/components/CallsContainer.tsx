//
// Copyright 2024 DXOS.org
//

import React, { type FC } from 'react';

import { StackItem } from '@dxos/react-ui-stack';

import { Calls, type CallsProps } from './Calls';

const CallsContainer: FC<CallsProps> = ({ roomId, storybookQueueDxn }) => {
  return (
    <StackItem.Content toolbar={false} classNames='h-full w-full overflow-hidden'>
      <Calls
        // TODO(mykola): Conflicts with the space swarm topic. Derive key from space key?
        roomId={roomId}
        storybookQueueDxn={storybookQueueDxn}
      />
    </StackItem.Content>
  );
};

export default CallsContainer;
