//
// Copyright 2024 DXOS.org
//

import { useEffect, useMemo, useRef, useState } from 'react';

import { type Stream } from '@dxos/codec-protobuf';
import { generateName } from '@dxos/display-name';
import { log } from '@dxos/log';
import { type SwarmResponse } from '@dxos/protocols/proto/dxos/edge/messenger';
import { useClient, type PublicKey } from '@dxos/react-client';
import { useIdentity } from '@dxos/react-client/halo';

import { codec, type RoomState, type UserState } from '../../types';

export const useRoom = ({ roomId }: { roomId: PublicKey }) => {
  const [roomState, setRoomState] = useState<RoomState>({
    users: [],
    meetingId: roomId.toHex(),
  });

  const haloIdentity = useIdentity();
  const client = useClient();
  const identityKey = haloIdentity!.identityKey.toHex();
  const displayName = haloIdentity?.profile?.displayName ?? generateName(haloIdentity!.identityKey.toHex());
  const peerKey = client.halo.device!.deviceKey.toHex();

  const stream = useRef<Stream<SwarmResponse>>();

  useEffect(() => {
    if (!stream.current) {
      stream.current = client.services.services.NetworkService!.subscribeSwarmState({ topic: roomId });
      stream.current.subscribe((event) => {
        log.info('roomState', {
          users: event.peers?.map((p) => codec.decode(p.state!)) ?? [],
          meetingId: roomId.toHex(),
        });
        setRoomState({ users: event.peers?.map((p) => codec.decode(p.state!)) ?? [], meetingId: roomId.toHex() });
      });

      client.services.services.NetworkService?.joinSwarm({
        topic: roomId,
        peer: {
          identityKey,
          peerKey,
          state: codec.encode({
            id: peerKey,
            name: displayName,
            joined: false,
            raisedHand: false,
            speaking: false,
            tracks: {},
          }),
        },
      }).catch((err) => log.catch(err));
    }
  }, [roomId]);

  useEffect(() => {
    const onBeforeUnload = () => {
      log.info('leaving room', { roomId });
      client.services.services.NetworkService?.leaveSwarm({ topic: roomId, peer: { identityKey, peerKey } }).catch(
        (err) => log.catch(err),
      );
      stream.current?.close().catch((err) => log.catch(err));
      stream.current = undefined;
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [roomId]);

  const identity: UserState = useMemo(
    () => ({
      ...roomState.users!.find((u) => u.id === peerKey),
      name: displayName,
    }),
    [roomState.users, peerKey, displayName],
  );

  const otherUsers: UserState[] = useMemo(
    () => roomState.users!.filter((u) => u.id !== peerKey),
    [roomState.users, peerKey],
  );
  log.info('otherUsers', { identity, otherUsers });
  return {
    identity,
    otherUsers,
    roomState,
    updateUserState: (user: UserState) =>
      client.services.services.NetworkService?.joinSwarm({
        topic: roomId,
        peer: {
          identityKey,
          peerKey,
          state: codec.encode(user),
        },
      }).catch((err) => log.catch(err)),
  };
};
