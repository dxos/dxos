//
// Copyright 2024 DXOS.org
//

import React, { type FC } from 'react';

import { StackItem } from '@dxos/react-ui-stack';

import { Calls, type CallsProps } from './Calls';

const CallsContainer: FC<CallsProps> = ({ roomId, queue }) => {
  return (
    <StackItem.Content toolbar={false}>
      <Calls
        // TODO(mykola): Conflicts with the space swarm topic. Derive key from space key?
        roomId={roomId}
        queue={queue}
      />
    </StackItem.Content>
  );
};

export default CallsContainer;
