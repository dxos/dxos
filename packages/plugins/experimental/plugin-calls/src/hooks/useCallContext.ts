//
// Copyright 2024 DXOS.org
//

import { createContext, useContext, type Dispatch, type SetStateAction } from 'react';

import { raise } from '@dxos/debug';
import { type ReactiveEchoObject } from '@dxos/echo-db';
import { type TranscriptType } from '@dxos/plugin-transcription/types';

import { type UserMedia } from './useUserMedia';
import { type CallsServicePeer } from '../util';

export type CallContextType = {
  /**
   * Undefined until the peer is opened.
   */
  peer?: CallsServicePeer;
  userMedia: UserMedia;

  isSpeaking: boolean;

  iceConnectionState: RTCIceConnectionState;
  dataSaverMode: boolean;
  setDataSaverMode: Dispatch<SetStateAction<boolean>>;

  onTranscription?: () => Promise<ReactiveEchoObject<TranscriptType>>;
};

export const CallContext = createContext<CallContextType | undefined>(undefined);

export const useCallContext = () => {
  return useContext(CallContext) ?? raise(new Error('Missing CallContext'));
};
