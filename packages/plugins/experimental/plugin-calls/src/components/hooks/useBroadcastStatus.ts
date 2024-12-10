//
// Copyright 2024 DXOS.org
//

import type PartySocket from 'partysocket';
import { useEffect } from 'react';
import { useUnmount } from 'react-use';

import { useSubscribedState } from './rxjsHooks';
import type { RoomContextType } from './useRoomContext';
import type { UserMedia } from './useUserMedia';
import type { ClientMessage, User } from '../types';
import type { RxjsPeer } from '../utils/rxjs/RxjsPeer.client';

interface Config {
  userMedia: UserMedia;
  peer: RxjsPeer;
  identity?: User;
  websocket: PartySocket;
  pushedTracks: RoomContextType['pushedTracks'];
  speaking?: boolean;
  raisedHand?: boolean;
}

export default ({ userMedia, identity, websocket, peer, pushedTracks }: Config) => {
  const { audioEnabled, videoEnabled, screenShareEnabled } = userMedia;
  const { audio, video, screenshare } = pushedTracks;
  const { sessionId } = useSubscribedState(peer.session$) ?? {};

  const id = identity?.id;
  const name = identity?.name;
  useEffect(() => {
    if (id && name) {
      const user: User = {
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
        websocket.send(
          JSON.stringify({
            type: 'userUpdate',
            user,
          } satisfies ClientMessage),
        );
      };

      // let's send our userUpdate right away
      sendUserUpdate();

      // anytime we reconnect, we need to resend our userUpdate
      websocket.addEventListener('open', sendUserUpdate);

      return () => websocket.removeEventListener('open', sendUserUpdate);
    }
  }, [id, name, websocket, sessionId, audio, video, screenshare, audioEnabled, videoEnabled, screenShareEnabled]);

  useUnmount(() => {
    if (id && name) {
      websocket.send(
        JSON.stringify({
          type: 'userUpdate',
          user: {
            id,
            name,
            joined: false,
            raisedHand: false,
            speaking: false,
            transceiverSessionId: sessionId,
            tracks: {},
          },
        } satisfies ClientMessage),
      );
    }
  });
};
