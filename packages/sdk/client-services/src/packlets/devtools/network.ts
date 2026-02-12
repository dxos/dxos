//
// Copyright 2020 DXOS.org
//

import { Stream } from '@dxos/codec-protobuf/stream';
import { Context } from '@dxos/context';
import { PublicKey } from '@dxos/keys';
import { type SignalManager } from '@dxos/messaging';
import { type SwarmNetworkManager } from '@dxos/network-manager';
import { create, timestampFromDate } from '@dxos/protocols/buf';
import {
  type GetNetworkPeersRequest,
  type GetNetworkPeersResponse,
  GetNetworkPeersResponseSchema,
  type SignalResponse,
  SignalResponseSchema,
  type SubscribeToNetworkTopicsResponse,
  SubscribeToNetworkTopicsResponseSchema,
  type SubscribeToSignalStatusResponse,
  SubscribeToSignalStatusResponseSchema,
  type SubscribeToSwarmInfoResponse,
  SubscribeToSwarmInfoResponseSchema,
} from '@dxos/protocols/buf/dxos/devtools/host_pb';
import { PublicKeySchema } from '@dxos/protocols/buf/dxos/keys_pb';

export const subscribeToNetworkStatus = ({ signalManager }: { signalManager: SignalManager }) =>
  new Stream<SubscribeToSignalStatusResponse>(({ next, close }) => {
    const update = () => {
      try {
        const status = signalManager.getStatus?.();
        next(create(SubscribeToSignalStatusResponseSchema, { servers: status as never }));
      } catch (err: any) {
        close(err);
      }
    };

    signalManager.statusChanged?.on(() => update());
    update();
  });

export const subscribeToSignal = ({ signalManager }: { signalManager: SignalManager }) =>
  new Stream<SignalResponse>(({ next }) => {
    const ctx = new Context();
    signalManager.onMessage.on(ctx, (message) => {
      next(
        create(SignalResponseSchema, {
          data: {
            case: 'message',
            value: {
              author: PublicKey.from(message.author!.peerKey).asUint8Array(),
              recipient: PublicKey.from(message.recipient!.peerKey).asUint8Array(),
              payload: message.payload,
            },
          },
          receivedAt: timestampFromDate(new Date()),
        }),
      );
    });
    signalManager.swarmEvent.on(ctx, (swarmEvent) => {
      const swarmEventData =
        swarmEvent.event.case === 'peerAvailable'
          ? {
              peerAvailable: {
                peer: PublicKey.from(swarmEvent.event.value.peer!.peerKey).asUint8Array(),
                since: swarmEvent.event.value.since,
              },
            }
          : {
              peerLeft: {
                peer: PublicKey.from(swarmEvent.event.value!.peer!.peerKey).asUint8Array(),
              },
            };
      next(
        create(SignalResponseSchema, {
          data: {
            case: 'swarmEvent',
            value: swarmEventData as never,
          },
          topic: swarmEvent.topic!.data,
          receivedAt: timestampFromDate(new Date()),
        }),
      );
    });
    return () => {
      return ctx.dispose();
    };
  });

export const subscribeToNetworkTopics = ({ networkManager }: { networkManager: SwarmNetworkManager }) =>
  new Stream<SubscribeToNetworkTopicsResponse>(({ next, close }) => {
    const update = () => {
      try {
        const topics = networkManager.topics;
        const labeledTopics = topics.map((topic) => ({
          topic: create(PublicKeySchema, { data: topic.asUint8Array() }),
          label: networkManager.getSwarm(topic)?.label ?? topic.toHex(),
        }));
        next(create(SubscribeToNetworkTopicsResponseSchema, { topics: labeledTopics }));
      } catch (err: any) {
        close(err);
      }
    };
    networkManager.topicsUpdated.on(update);

    update();
  });

export const subscribeToSwarmInfo = ({ networkManager }: { networkManager: SwarmNetworkManager }) =>
  new Stream<SubscribeToSwarmInfoResponse>(({ next }) => {
    const update = () => {
      const info = networkManager.connectionLog?.swarms;
      if (info) {
        next(create(SubscribeToSwarmInfoResponseSchema, { data: info as never }));
      }
    };
    networkManager.connectionLog?.update.on(update);
    update();
  });

export const getNetworkPeers = (
  { networkManager }: { networkManager: SwarmNetworkManager },
  request: GetNetworkPeersRequest,
): GetNetworkPeersResponse => {
  if (!request.topic?.length) {
    throw new Error('Expected a network topic');
  }

  const map = networkManager.getSwarmMap(PublicKey.from(request.topic));
  return create(GetNetworkPeersResponseSchema, {
    peers: map?.peers.map((peer) => ({
      id: create(PublicKeySchema, { data: peer.id.asUint8Array() }),
      state: peer.state,
      connections: peer.connections.map((connection) => connection.asUint8Array()),
    })),
  });
};
