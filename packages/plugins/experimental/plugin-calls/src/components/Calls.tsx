//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { type PublicKey } from '@dxos/react-client';

import { JoinedRoom } from './JoinedRoom';
import { Lobby } from './Lobby';
import { RoomContextProvider } from './RoomContextProvider';
import { useRoomContext } from './hooks/useRoomContext';

export type CallsProps = {
  roomId: PublicKey;
  iceServers: RTCIceServer[];
  noRouter?: boolean;
};

// TODO(mykola): Better name for this component.
const Room = () => {
  const { joined } = useRoomContext();
  return joined ? <JoinedRoom /> : <Lobby />;
};

/**
 * Entrypoint for app and extension (no direct dependency on Client).
 */
export const Calls = ({ roomId, iceServers }: CallsProps) => {
  return (
    <RoomContextProvider roomId={roomId} iceServers={iceServers}>
      <Room />
    </RoomContextProvider>
  );
};
