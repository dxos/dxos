//
// Copyright 2024 DXOS.org
//

import { useEffect } from 'react';
import { useUnmount } from 'react-use';

import { buf } from '@dxos/protocols/buf';
import { TracksSchema } from '@dxos/protocols/buf/dxos/edge/calls_pb';
import { type UserState } from '@dxos/protocols/proto/dxos/edge/calls';

import type { RoomContextType } from './useRoomContext';
import type { UserMedia } from './useUserMedia';
import { useSubscribedState } from './utils';
import type { RxjsPeer } from '../utils';

interface Config {
  userMedia: UserMedia;
  peer: RxjsPeer;
  identity?: UserState;
  updateUserState: (user: UserState) => void;
  pushedTracks: RoomContextType['pushedTracks'];
  speaking?: boolean;
  raisedHand?: boolean;
}

export const useBroadcastStatus = ({ userMedia, identity, peer, pushedTracks, updateUserState }: Config) => {
  const { audioEnabled, videoEnabled, screenShareEnabled } = userMedia;
  const { audio, video, screenshare } = pushedTracks;
  const { sessionId } = useSubscribedState(peer.session$) ?? {};
  const id = identity!.id;
  const name = identity!.name;
  useEffect(() => {
    updateUserState({
      id,
      name,
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
  }, [id, name, sessionId, audio, video, screenshare, audioEnabled, videoEnabled, screenShareEnabled]);

  useUnmount(() => {
    updateUserState({
      id,
      name,
      joined: false,
      raisedHand: false,
      speaking: false,
      transceiverSessionId: sessionId,
      tracks: buf.create(TracksSchema, {}),
    });
  });
};
