//
// Copyright 2024 DXOS.org
//

import { useEffect } from 'react';
import { useUnmount } from 'react-use';

import { log } from '@dxos/log';
import { buf } from '@dxos/protocols/buf';
import { TracksSchema, TranscriptionSchema } from '@dxos/protocols/buf/dxos/edge/calls_pb';

import { type Ai } from './useAi';
import type { RoomContextType } from './useRoomContext';
import type { UserMedia } from './useUserMedia';
import { useSubscribedState } from './utils';
import { type UserState } from '../types';
import type { RxjsPeer } from '../utils';

interface Config {
  ai: Ai;
  userMedia: UserMedia;
  peer: RxjsPeer;
  identity?: UserState;
  speaking?: boolean;
  raisedHand?: boolean;
  pushedTracks: RoomContextType['pushedTracks'];
  updateUserState: (user: UserState) => void;
}

export const useBroadcastStatus = ({
  userMedia,
  identity,
  peer,
  pushedTracks,
  updateUserState,
  ai,
  speaking,
}: Config) => {
  const { audioEnabled, videoEnabled, screenShareEnabled } = userMedia;
  const { audio, video, screenshare } = pushedTracks;
  const { sessionId } = useSubscribedState(peer.session$) ?? {};
  useEffect(() => {
    if (!identity) {
      return;
    }
    const state: UserState = {
      id: identity.id,
      name: identity.name,
      joined: true,
      raisedHand: false,
      speaking,
      transceiverSessionId: sessionId,
      tracks: buf.create(TracksSchema, {
        audioEnabled,
        videoEnabled,
        screenShareEnabled,
        video,
        audio,
        screenshare,
      }),
      transcription: buf.create(TranscriptionSchema, ai.transcription),
    };

    log.info('>>> useBroadcastStatus', { state });
    updateUserState(state);
    const t = setInterval(() => {
      try {
        updateUserState(state);
      } catch (err) {
        log.error('useBroadcastStatus', { err });
      }
    }, 2_000);

    return () => {
      clearInterval(t);
    };
  }, [
    identity?.id,
    identity?.name,
    identity?.joined,
    sessionId,
    audio,
    video,
    screenshare,
    audioEnabled,
    videoEnabled,
    screenShareEnabled,
    ai.transcription.enabled,
    speaking,
  ]);

  useUnmount(() => {
    if (!identity) {
      return;
    }

    updateUserState({
      id: identity.id,
      name: identity.name,
      joined: false,
      raisedHand: false,
      speaking: false,
      transceiverSessionId: sessionId,
      tracks: buf.create(TracksSchema, {}),
      transcription: buf.create(TranscriptionSchema, {}),
    });
  });
};
