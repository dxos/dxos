//
// Copyright 2024 DXOS.org
//

import { useEffect } from 'react';
import { useUnmount } from 'react-use';

import { type TranscriptionState } from '@dxos/plugin-transcription/types';
import { buf } from '@dxos/protocols/buf';
import { TracksSchema, TranscriptionSchema } from '@dxos/protocols/buf/dxos/edge/calls_pb';

import { type CallContextType } from './useCallContext';
import { type UserMedia } from './useUserMedia';
import { type UserState } from '../types';
import { type CallsServicePeer } from '../util';

type UseBroadcastStatus = {
  transcription: TranscriptionState;
  peer?: CallsServicePeer;
  userMedia: UserMedia;
  pushedTracks: CallContextType['pushedTracks'];
  self?: UserState;
  raisedHand?: boolean;
  speaking?: boolean;
  onUpdateUserState: (state: UserState) => void;
};

export const useBroadcastStatus = ({
  transcription,
  peer,
  userMedia,
  pushedTracks,
  self,
  raisedHand,
  speaking,
  onUpdateUserState,
}: UseBroadcastStatus): void => {
  const { audioEnabled, videoEnabled, screenshareEnabled } = userMedia.state;
  const { audio, video, screenshare } = pushedTracks;
  const sessionId = peer?.session?.sessionId;
  useEffect(() => {
    // Note: It is important to check for self.id to ensure that we join with id, and id should be stable.
    if (!self?.id) {
      return;
    }

    const state: UserState = {
      id: self.id,
      name: self.name,
      joined: true,
      raisedHand,
      speaking,
      transceiverSessionId: sessionId,
      tracks: buf.create(TracksSchema, {
        audioEnabled,
        videoEnabled,
        screenshareEnabled,
        audio,
        video,
        screenshare,
      }),
      transcription: buf.create(TranscriptionSchema, transcription),
    };

    onUpdateUserState(state);
  }, [
    self?.id,
    self?.name,
    self?.joined,
    sessionId,
    audio,
    video,
    screenshare,
    audioEnabled,
    videoEnabled,
    screenshareEnabled,
    raisedHand,
    speaking,
    transcription.enabled,
  ]);

  useUnmount(() => {
    if (!self?.id) {
      return;
    }

    onUpdateUserState({
      id: self.id,
      name: self.name,
      joined: false,
      raisedHand: false,
      speaking: false,
      transceiverSessionId: sessionId,
      tracks: buf.create(TracksSchema, {}),
      transcription: buf.create(TranscriptionSchema, {}),
    });
  });
};
