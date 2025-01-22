//
// Copyright 2024 DXOS.org
//

import { useEffect } from 'react';
import { useUnmount } from 'react-use';

import { type UserState } from '@dxos/protocols/proto/dxos/edge/calls';

import { useSubscribedState } from './rxjsHooks';
import type { RoomContextType } from './useRoomContext';
import type { UserMedia } from './useUserMedia';
import type { RxjsPeer } from '../utils/rxjs/RxjsPeer.client';

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

  const id = identity?.id;
  const name = identity?.name;
  useEffect(() => {
    if (id && name) {
      const user: UserState = {
        id,
        name,
        joined: true,
        raisedHand: false,
        speaking: false,
        transceiverSessionId: sessionId,
        tracks: {
          audioEnabled,
          videoEnabled,
          screenShareEnabled,
          video,
          audio,
          screenshare,
        },
      };

      const sendUserUpdate = () => {
        updateUserState(user);
      };

      // let's send our userUpdate right away
      sendUserUpdate();
    }
  }, [id, name, sessionId, audio, video, screenshare, audioEnabled, videoEnabled, screenShareEnabled]);

  useUnmount(() => {
    if (id && name) {
      updateUserState({
        id,
        name,
        joined: false,
        raisedHand: false,
        speaking: false,
        transceiverSessionId: sessionId,
        tracks: {},
      });
    }
  });
};
