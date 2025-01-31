//
// Copyright 2024 DXOS.org
//

import { useEffect, useMemo, useRef, useState } from 'react';

import { log } from '@dxos/log';
import { type buf } from '@dxos/protocols/buf';
import { type UserState, type RoomStateSchema } from '@dxos/protocols/buf/dxos/edge/calls_pb';
import { type Peer } from '@dxos/protocols/buf/dxos/edge/messenger_pb';
import { type PublicKey, useClient } from '@dxos/react-client';

import { codec } from '../../types';

export const useRoom = ({ roomId, username }: { roomId: PublicKey; username: string }) => {
  const [roomState, setRoomState] = useState<buf.MessageInitShape<typeof RoomStateSchema>>({
    users: [],
    meetingId: roomId.toHex(),
  });

  const userLeftFunctionRef = useRef(() => {});

  useEffect(() => {
    return () => userLeftFunctionRef.current();
  }, []);

  const client = useClient();
  const peerInfo: Peer = {
    $typeName: 'dxos.edge.messenger.Peer',
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

  useMemo(() => {
    const stream = client.services.services.NetworkService!.subscribeSwarmState({ topic: roomId });
    stream.subscribe((event) => {
      setRoomState({ users: event.peers?.map((p) => codec.decode(p.state!)) ?? [], meetingId: roomId.toHex() });
    });

    client.services.services.NetworkService?.joinSwarm({ topic: roomId, peer: peerInfo }).catch((err) =>
      log.catch(err),
    );
    log.verbose('joined room', { roomId, peerInfo });
  }, [roomId]);

  useEffect(() => {
    const onBeforeUnload = () => {
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

  return {
    identity,
    otherUsers,
    roomState,
    updateUserState: (user: UserState) => {
      client.services.services
        .NetworkService!.joinSwarm({
          topic: roomId,
          peer: { ...peerInfo, state: codec.encode(user) },
        })
        .catch((err) => log.catch(err));
    },
  };
};
