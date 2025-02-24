//
// Copyright 2024 DXOS.org
//

import { useEffect } from 'react';
import { useUnmount } from 'react-use';

import { log } from '@dxos/log';
import { buf } from '@dxos/protocols/buf';
import { TracksSchema, TranscriptionSchema } from '@dxos/protocols/buf/dxos/edge/calls_pb';

import { useAi } from './useAi';
import { type CallContextType } from './useCallContext';
import { type UserMedia } from './useUserMedia';
import { useSubscribedState } from './utils';
import { type UserState } from '../types';
import { type RxjsPeer } from '../utils';

const BROADCAST_INTERVAL = 2_000;

type UseBroadcastStatus = {
  peer: RxjsPeer;
  userMedia: UserMedia;
  pushedTracks: CallContextType['pushedTracks'];
  user?: UserState;
  raisedHand?: boolean;
  speaking?: boolean;
  onUpdateUserState: (state: UserState) => void;
};

export const useBroadcastStatus = ({
  peer,
  userMedia,
  pushedTracks,
  user,
  raisedHand,
  speaking,
  onUpdateUserState,
}: UseBroadcastStatus): void => {
  const ai = useAi();
  const { audioEnabled, videoEnabled, screenshareEnabled } = userMedia;
  const { audio, video, screenshare } = pushedTracks;
  const { sessionId } = useSubscribedState(peer.session$) ?? {};
  useEffect(() => {
    if (!user) {
      return;
    }

    const state: UserState = {
      id: user.id,
      name: user.name,
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
      transcription: buf.create(TranscriptionSchema, ai.transcription),
    };

    onUpdateUserState(state);
    const t = setInterval(() => {
      try {
        onUpdateUserState(state);
      } catch (err) {
        log.error('useBroadcastStatus', { err });
      }
    }, BROADCAST_INTERVAL);

    return () => {
      clearInterval(t);
    };
  }, [
    user?.id,
    user?.name,
    user?.joined,
    sessionId,
    audio,
    video,
    screenshare,
    audioEnabled,
    videoEnabled,
    screenshareEnabled,
    raisedHand,
    speaking,
    ai.transcription.enabled,
  ]);

  useUnmount(() => {
    if (!user) {
      return;
    }

    onUpdateUserState({
      id: user.id,
      name: user.name,
      joined: false,
      raisedHand: false,
      speaking: false,
      transceiverSessionId: sessionId,
      tracks: buf.create(TracksSchema, {}),
      transcription: buf.create(TranscriptionSchema, {}),
    });
  });
};
