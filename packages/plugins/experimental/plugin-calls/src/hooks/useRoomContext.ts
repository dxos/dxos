//
// Copyright 2024 DXOS.org
//

import { createContext, useContext, type Dispatch, type SetStateAction } from 'react';

import { raise } from '@dxos/debug';
import { type Space } from '@dxos/react-client/echo';

import { type UseRoomState } from './useRoom';
import { type UserMedia } from './useUserMedia';
import { type RxjsPeer } from '../utils';

export type RoomContextType = {
  space: Space;
  joined: boolean;
  setJoined: Dispatch<SetStateAction<boolean>>;
  dataSaverMode: boolean;
  setDataSaverMode: Dispatch<SetStateAction<boolean>>;
  userMedia: UserMedia;
  iceConnectionState: RTCIceConnectionState;
  peer: RxjsPeer;
  room: UseRoomState;
  pushedTracks: {
    screenshare?: string;
    video?: string;
    audio?: string;
  };
};

export const RoomContext = createContext<RoomContextType | undefined>(undefined);

export const useRoomContext = () => {
  return useContext(RoomContext) ?? raise(new Error('Missing RoomContextProvider'));
};
