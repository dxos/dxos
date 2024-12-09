//
// Copyright 2024 DXOS.org
//

import usePartySocket from 'partysocket/react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { log } from '@dxos/log';

import type { UserMedia } from './useUserMedia';
import { CALLS_URL } from '../../types';
import type { ClientMessage, RoomState, ServerMessage } from '../types';

export default ({ roomName, userMedia, username }: { roomName: string; userMedia: UserMedia; username: string }) => {
  const [roomState, setRoomState] = useState<RoomState>({ users: [] });

  const userLeftFunctionRef = useRef(() => {});

  useEffect(() => {
    return () => userLeftFunctionRef.current();
  }, []);

  const websocket = usePartySocket({
    host: CALLS_URL,
    party: 'rooms',
    room: roomName,
    query: { username },
    onMessage: (e) => {
      const message = JSON.parse(e.data) as ServerMessage;
      switch (message.type) {
        case 'roomState':
          // prevent updating state if nothing has changed
          if (JSON.stringify(message.state) === JSON.stringify(roomState)) {
            break;
          }
          setRoomState(message.state);
          break;
        case 'error':
          log.error('Received error message from WebSocket');
          log.error(message.error ?? 'No error message provided');
          break;
        case 'directMessage':
          break;
        case 'muteMic':
          userMedia.turnMicOff();
          break;
        case 'partyserver-pong':
          // do nothing
          break;
        default:
          throw new Error('Unhandled: ' + message);
      }
    },
  });

  userLeftFunctionRef.current = () => websocket.send(JSON.stringify({ type: 'userLeft' } satisfies ClientMessage));

  useEffect(() => {
    const onBeforeUnload = () => {
      userLeftFunctionRef.current();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [websocket]);

  // setup a simple ping pong
  useEffect(() => {
    const interval = setInterval(() => {
      websocket.send(JSON.stringify({ type: 'partyserver-ping' } satisfies ClientMessage));
    }, 5000);

    return () => clearInterval(interval);
  }, [websocket]);

  const identity = useMemo(() => roomState.users.find((u) => u.id === websocket.id), [roomState.users, websocket.id]);

  const otherUsers = useMemo(
    () => roomState.users.filter((u) => u.id !== websocket.id && u.joined),
    [roomState.users, websocket.id],
  );

  return { identity, otherUsers, websocket, roomState };
};
