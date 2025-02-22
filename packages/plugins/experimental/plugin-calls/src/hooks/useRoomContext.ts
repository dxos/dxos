//
// Copyright 2024 DXOS.org
//

import { createContext, useContext, type Dispatch, type SetStateAction } from 'react';

import { raise } from '@dxos/debug';
import { type ReactiveEchoObject } from '@dxos/echo-db';
import { type ThreadType } from '@dxos/plugin-space/types';
import { type PublicKey } from '@dxos/react-client';

import { type UseRoomState } from './useRoom';
import { type UserMedia } from './useUserMedia';
import { type TranscriptType } from '../types';
import { type RxjsPeer } from '../utils';

// TODO(mykola): Rename to CallsContextType.
export type RoomContextType = {
  roomId: PublicKey;
  thread?: ThreadType;
  isSpeaking: boolean;
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

  onTranscription?: () => Promise<ReactiveEchoObject<TranscriptType>>;
};

export const RoomContext = createContext<RoomContextType | undefined>(undefined);

export const useRoomContext = () => {
  return useContext(RoomContext) ?? raise(new Error('Missing RoomContextProvider'));
};
