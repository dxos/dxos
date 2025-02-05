//
// Copyright 2024 DXOS.org
//

import React from 'react';

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
  iceServers: RTCIceServer[];
  noRouter?: boolean;
};

/**
 * Entrypoint for app and extension (no direct dependency on Client).
 */
export const Calls = ({ roomId, iceServers }: CallsProps) => {
  return (
    <CallsContextProvider roomId={roomId} iceServers={iceServers}>
      <Content />
    </CallsContextProvider>
  );
};
