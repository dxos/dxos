//
// Copyright 2024 DXOS.org
//

import { createContext, useContext, type Dispatch, type SetStateAction } from 'react';

import { raise } from '@dxos/debug';
import { type ReactiveEchoObject } from '@dxos/echo-db';
import { type PublicKey } from '@dxos/react-client';

import { type CallState } from './useCallState';
import { type UserMedia } from './useUserMedia';
import { type TranscriptType } from '../types';
import { type RxjsPeer } from '../utils';

export type CallContextType = {
  roomId: PublicKey;
  call: CallState;
  peer: RxjsPeer;
  userMedia: UserMedia;

  joined: boolean;
  setJoined: Dispatch<SetStateAction<boolean>>;
  isSpeaking: boolean;

  iceConnectionState: RTCIceConnectionState;
  dataSaverMode: boolean;
  setDataSaverMode: Dispatch<SetStateAction<boolean>>;

  pushedTracks: {
    screenshare?: string;
    video?: string;
    audio?: string;
  };

  onTranscription?: () => Promise<ReactiveEchoObject<TranscriptType>>;
};

export const CallContext = createContext<CallContextType | undefined>(undefined);

export const useCallContext = () => {
  return useContext(CallContext) ?? raise(new Error('Missing CallContext'));
};
