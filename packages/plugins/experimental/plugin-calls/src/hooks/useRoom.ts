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

import { useAi, type Ai } from './useAi';
import { codec, type RoomState, type UserState } from '../types';

export type UseRoomState = {
  roomState: RoomState;
  identity: UserState;
  otherUsers: UserState[];
  ai: Ai;
  updateUserState: (user: UserState) => void;
};

export const useRoom = ({ roomId }: { roomId: PublicKey }): UseRoomState => {
  const [roomState, setRoomState] = useState<RoomState>({
    meetingId: roomId.toHex(),
    users: [],
  });

  const ai = useAi();
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
          users: event.peers?.map((peer) => codec.decode(peer.state!)) ?? [],
          meetingId: roomId.toHex(),
        });
        const users = event.peers?.map((p) => codec.decode(p.state!)) ?? [];
        setRoomState({ users, meetingId: roomId.toHex() });
        // Note: Small CRDT for merging transcription states.
        const maxTimestamp = Math.max(...users.map((user) => user.transcription?.lamportTimestamp ?? 0));
        const newTranscriptionState = users.find(
          (user) => user.transcription && user.transcription.lamportTimestamp === maxTimestamp,
        );
        if (maxTimestamp > ai.transcription.lamportTimestamp! && newTranscriptionState) {
          log.info('>>> newTranscriptionState', { newTranscriptionState });
          ai.setTranscription(newTranscriptionState.transcription!);
        }
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
              raisedHand: false,
              speaking: false,
              tracks: {},
              transcription: ai.transcription,
            }),
          },
        })
        .catch(log.catch);
    }
  }, [roomId]);

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

  const identity = useMemo<UserState>(
    () => ({
      ...roomState.users!.find((user) => user.id === peerKey),
      name: displayName,
    }),
    [roomState.users, peerKey, displayName],
  );

  const otherUsers = useMemo<UserState[]>(
    () => roomState.users!.filter((user) => user.id !== peerKey),
    [roomState.users, peerKey],
  );

  return {
    ai,
    identity,
    otherUsers,
    roomState,
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
