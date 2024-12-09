//
// Copyright 2024 DXOS.org
//

import { createContext, useContext, type Dispatch, type SetStateAction } from 'react';

import { invariant } from '@dxos/invariant';

import type useRoom from './useRoom';
import type { UserMedia } from './useUserMedia';
import type { RxjsPeer } from '../utils/rxjs/RxjsPeer.client';

export type RoomContextType = {
  traceLink?: string;
  userDirectoryUrl?: string;
  joined: boolean;
  setJoined: Dispatch<SetStateAction<boolean>>;
  dataSaverMode: boolean;
  setDataSaverMode: Dispatch<SetStateAction<boolean>>;
  userMedia: UserMedia;
  peer: RxjsPeer;
  iceConnectionState: RTCIceConnectionState;
  room: ReturnType<typeof useRoom>;
  pushedTracks: {
    video?: string;
    audio?: string;
    screenshare?: string;
  };
};

export const RoomContext = createContext<RoomContextType | undefined>(undefined);

export const useRoomContext = () => {
  const context = useContext(RoomContext);
  invariant(context, 'useRoomContext must be used within a RoomContextProvider');
  return context;
};
