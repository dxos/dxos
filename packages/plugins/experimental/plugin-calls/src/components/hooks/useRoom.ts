//
// Copyright 2024 DXOS.org
//

import { useEffect, useMemo, useRef, useState } from 'react';

import { log } from '@dxos/log';
import { type UserState, type RoomState } from '@dxos/protocols/proto/dxos/edge/calls';
import { type Peer } from '@dxos/protocols/proto/dxos/edge/messenger';
import { type PublicKey, useClient } from '@dxos/react-client';

import { codec } from '../types';

export const useRoom = ({ roomId, username }: { roomId: PublicKey; username: string }) => {
  const [roomState, setRoomState] = useState<RoomState>({ users: [], meetingId: roomId.toHex() });

  const client = useClient();
  const peerInfo: Peer = {
    identityKey: client.halo.identity.get()!.identityKey.toHex(),
    peerKey: client.halo.device!.deviceKey.toHex(),
    state: codec.encode({
      id: client.halo.identity.get()!.identityKey.toHex(),
      name: username,
      joined: false,
      raisedHand: false,
      speaking: false,
      tracks: {},
    }),
  };

  const joined = useRef(false);

  useEffect(() => {
    const stream = client.services.services.NetworkService!.subscribeSwarmState({ topic: roomId });
    stream.subscribe((event) => {
      log.info('roomState', {
        users: event.peers?.map((p) => codec.decode(p.state!)) ?? [],
        meetingId: roomId.toHex(),
      });
      setRoomState({ users: event.peers?.map((p) => codec.decode(p.state!)) ?? [], meetingId: roomId.toHex() });
    });

    if (!joined.current) {
      client.services.services.NetworkService?.joinSwarm({ topic: roomId, peer: peerInfo }).catch((err) =>
        log.catch(err),
      );
      joined.current = true;
      log.info('joined room', { roomId, peerInfo });
    }
  }, [roomId]);

  useEffect(() => {
    const onBeforeUnload = () => {
      log.info('leaving room', { roomId, peerInfo });
      client.services.services.NetworkService?.leaveSwarm({ topic: roomId, peer: peerInfo }).catch((err) =>
        log.catch(err),
      );
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [roomId]);

  const identity = useMemo(
    () => roomState.users!.find((u) => u.id === peerInfo.identityKey!),
    [roomState.users, peerInfo.identityKey],
  );

  const otherUsers = useMemo(
    () => roomState.users!.filter((u) => u.id !== peerInfo.identityKey!),
    [roomState.users, peerInfo.identityKey],
  );
  log.info('otherUsers', { identity, otherUsers });
  return {
    identity,
    otherUsers,
    roomState,
    updateUserState: (user: UserState) => {
      client.services.services
        .NetworkService!.joinSwarm({
          topic: roomId,
          peer: { identityKey: peerInfo.identityKey, peerKey: peerInfo.peerKey, state: codec.encode(user) },
        })
        .catch((err) => log.catch(err));
    },
  };
};
