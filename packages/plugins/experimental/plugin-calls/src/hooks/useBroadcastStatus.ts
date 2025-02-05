//
// Copyright 2024 DXOS.org
//

import { useEffect } from 'react';
import { useUnmount } from 'react-use';

import { buf } from '@dxos/protocols/buf';
import { TracksSchema } from '@dxos/protocols/buf/dxos/edge/calls_pb';

import type { RoomContextType } from './useRoomContext';
import type { UserMedia } from './useUserMedia';
import { useSubscribedState } from './utils';
import { type UserState } from '../types';
import type { RxjsPeer } from '../utils';

interface Config {
  userMedia: UserMedia;
  peer: RxjsPeer;
  identity?: UserState;
  speaking?: boolean;
  raisedHand?: boolean;
  pushedTracks: RoomContextType['pushedTracks'];
  updateUserState: (user: UserState) => void;
}

export const useBroadcastStatus = ({ userMedia, identity, peer, pushedTracks, updateUserState }: Config) => {
  const { audioEnabled, videoEnabled, screenShareEnabled } = userMedia;
  const { audio, video, screenshare } = pushedTracks;
  const { sessionId } = useSubscribedState(peer.session$) ?? {};
  useEffect(() => {
    if (!identity) {
      return;
    }

    updateUserState({
      id: identity.id,
      name: identity.name,
      joined: true,
      raisedHand: false,
      speaking: false,
      transceiverSessionId: sessionId,
      tracks: buf.create(TracksSchema, {
        audioEnabled,
        videoEnabled,
        screenShareEnabled,
        video,
        audio,
        screenshare,
      }),
    });
  }, [identity, sessionId, audio, video, screenshare, audioEnabled, videoEnabled, screenShareEnabled]);

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
    });
  });
};
