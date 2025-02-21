//
// Copyright 2024 DXOS.org
//

import React, { type FC } from 'react';

import { type PublicKey } from '@dxos/react-client';
import { type Space } from '@dxos/react-client/echo';

import { Call } from './Call';
import { CallsContextProvider } from './CallsContextProvider';
import { Lobby } from './Lobby';
import { useRoomContext } from '../hooks';

const Content = () => {
  const { joined } = useRoomContext();
  return joined ? <Call /> : <Lobby />;
};

export type CallsProps = {
  space: Space;
  roomId: PublicKey;

  /**
   * DXN of the storybook queue.
   */
  storybookQueueDxn?: string;
};

/**
 * Entrypoint for app and extension (no direct dependency on Client).
 */
export const Calls: FC<CallsProps> = ({ space, roomId, storybookQueueDxn }) => {
  return (
    <CallsContextProvider space={space} roomId={roomId} storybookQueueDxn={storybookQueueDxn}>
      <Content />
    </CallsContextProvider>
  );
};
