//
// Copyright 2024 DXOS.org
//

import { createContext, useContext, type Dispatch, type SetStateAction } from 'react';

import type useRoom from './useRoom';
import type { useRoomHistory } from './useRoomHistory';
import type { UserMedia } from '../hooks/useUserMedia';
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
  roomHistory: ReturnType<typeof useRoomHistory>;
  pushedTracks: {
    video?: string;
    audio?: string;
    screenshare?: string;
  };
};

export const RoomContext = createContext<RoomContextType | undefined>(undefined);

export const useRoomContext = () => useContext(RoomContext);
