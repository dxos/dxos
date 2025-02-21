//
// Copyright 2024 DXOS.org
//

import React, { type FC } from 'react';

import { type PublicKey } from '@dxos/react-client';

import { Call } from './Call';
import { CallsContextProvider } from './CallsContextProvider';
import { Lobby } from './Lobby';
import { useRoomContext } from '../hooks';

const Content = () => {
  const { joined } = useRoomContext();
  return joined ? <Call /> : <Lobby />;
};

export type CallsProps = {
  roomId: PublicKey;

  /**
   * DXN of the storybook queue.
   */
  storybookQueueDxn?: string;
};

/**
 * Entrypoint for app and extension (no direct dependency on Client).
 */
export const Calls: FC<CallsProps> = ({ roomId, storybookQueueDxn }) => {
  return (
    <CallsContextProvider roomId={roomId} storybookQueueDxn={storybookQueueDxn}>
      <Content />
    </CallsContextProvider>
  );
};
