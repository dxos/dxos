//
// Copyright 2024 DXOS.org
//

import React, { type FC } from 'react';

import { Call } from './Call';
import { CallsContextProvider } from './CallsContextProvider';
import { Lobby } from './Lobby';
import { useRoomContext, type RoomContextType } from '../hooks';

export type CallsProps = Pick<RoomContextType, 'roomId' | 'onTranscription'>;

/**
 * Entrypoint for app and extension (no direct dependency on Client).
 */
export const Calls: FC<CallsProps> = (props) => {
  return (
    <CallsContextProvider {...props}>
      <Content />
    </CallsContextProvider>
  );
};

const Content = () => {
  const { joined } = useRoomContext();
  return joined ? <Call /> : <Lobby />;
};
