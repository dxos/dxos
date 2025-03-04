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

import { CallTranscription } from './transcription';
import { codec, type RoomState, type UserState } from '../types';

// TODO(burdon): Disambiguate room and call.
export type CallState = {
  room: RoomState;
  self: UserState;
  transcription: CallTranscription;
  updateUserState: (user: UserState) => void;
};

/**
 * Call session state.
 */
export const useCallState = ({ roomId }: { roomId: PublicKey }): CallState => {
  const [room, setRoom] = useState<RoomState>({
    meetingId: roomId.toHex(),
    users: [],
  });

  // TODO(burdon): Move to context.
  const [transcription] = useState<CallTranscription>(new CallTranscription());

  const client = useClient();
  const haloIdentity = useIdentity();
  const identityKey = haloIdentity!.identityKey.toHex();
  const displayName = haloIdentity?.profile?.displayName ?? generateName(haloIdentity!.identityKey.toHex());
  const peerKey = client.halo.device!.deviceKey.toHex();
  const stream = useRef<Stream<SwarmResponse>>();

  useEffect(() => {
    if (!stream.current) {
      stream.current = client.services.services.NetworkService!.subscribeSwarmState({ topic: roomId });
      stream.current.subscribe((event) => {
        log.info('room state', {
          users: event.peers?.map((peer) => codec.decode(peer.state!)) ?? [],
          meetingId: roomId.toHex(),
        });

        const users = event.peers?.map((peer) => codec.decode(peer.state!)) ?? [];
        setRoom({ meetingId: roomId.toHex(), users });
        transcription.saveNetworkState(users);
      });

      client.services.services
        .NetworkService!.joinSwarm({
          topic: roomId,
          peer: {
            identityKey,
            peerKey,
            state: codec.encode({
              id: peerKey,
              name: displayName,
              joined: false,
              tracks: {},
              transcription: transcription.state.value,
            }),
          },
        })
        .catch(log.catch);
    }
  }, [roomId]);

  // Swarm connection.
  useEffect(() => {
    const onBeforeUnload = () => {
      log.info('leaving room', { roomId });
      client.services.services.NetworkService?.leaveSwarm({ topic: roomId, peer: { identityKey, peerKey } }).catch(
        log.catch,
      );
      stream.current?.close().catch(log.catch);
      stream.current = undefined;
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [roomId]);

  // Current user.
  const self = useMemo<UserState>(
    () => ({
      ...room.users!.find((user) => user.id === peerKey),
      name: displayName,
    }),
    [room.users, peerKey, displayName],
  );

  return {
    room,
    self,
    transcription,
    updateUserState: (user: UserState) => {
      client.services.services
        .NetworkService!.joinSwarm({
          topic: roomId,
          peer: {
            identityKey,
            peerKey,
            state: codec.encode(user),
          },
        })
        .catch((err) => log.catch(err));
    },
  };
};
