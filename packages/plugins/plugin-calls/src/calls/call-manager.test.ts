//
// Copyright 2026 DXOS.org
//

// @vitest-environment happy-dom

import * as Option from 'effect/Option';
import * as AtomRegistry from 'effect/reactivity/AtomRegistry';
import { describe, test } from 'vitest';

import { Stream, waitForCondition } from '@dxos/async';
import { type Identity } from '@dxos/halo';
import { IdentityDid, PublicKey } from '@dxos/keys';
import { buf } from '@dxos/protocols/buf';
import { ActivitySchema } from '@dxos/protocols/buf/dxos/edge/calls_pb';
import {
  ConnectionState,
  PeerSchema,
  type SwarmResponse,
  SwarmResponseSchema,
} from '@dxos/protocols/buf/dxos/edge/messenger_pb';
import { type ContentBlock } from '@dxos/types';

import { FakeTransport } from '../testing/fake-transport.ts';
import { CallManager } from './call-manager.ts';
import { type CallNetworkService, MEETING_ACTIVITY_KEY } from './call-swarm-synchronizer.ts';
import { type CreateTransportOptions } from './media-transport.ts';
import { codec } from './types.ts';

const SELF_DEVICE = PublicKey.random().toHex();
const REMOTE_DEVICE = PublicKey.random().toHex();
const ROOM_ID = 'echo:/room-under-test';

describe('CallManager', () => {
  test('joins through the transport factory and advertises the meeting it got', async ({ expect }) => {
    const { manager, transports, network, advertised } = await setup();
    manager.setRoomId(ROOM_ID);
    await manager.join();

    expect(transports.map(({ options }) => options)).toEqual([{ roomId: ROOM_ID, meetingId: undefined }]);
    expect(manager.joined).toBe(true);
    expect(advertised()).toBe('meeting-1');

    // A peer already in the room is asked for its meeting.
    network.setQueryPeers([peer(REMOTE_DEVICE, 'meeting-remote')]);
    await manager.leave();
    await manager.join();
    expect(transports.at(-1)?.options).toEqual({ roomId: ROOM_ID, meetingId: 'meeting-remote' });

    await manager.close();
  });

  test('emits only the final text of its own speech, in order', async ({ expect }) => {
    const { manager, transports } = await setup();
    manager.setRoomId(ROOM_ID);
    const segments: ContentBlock.Transcript[] = [];
    manager.transcript.on((segment) => {
      segments.push(segment);
    });
    await manager.join();

    const transport = transports[0].transport;
    transport.emitTranscript({ text: 'hello', pending: true });
    transport.emitTranscript({ text: 'hello there ', started: '2026-11-10T12:00:00.000Z' });
    transport.emitTranscript({ text: '   ' });
    transport.emitTranscript({ text: 'and again', started: '2026-11-10T12:00:02.000Z' });

    expect(segments).toEqual([
      { _tag: 'transcript', started: '2026-11-10T12:00:00.000Z', text: 'hello there' },
      { _tag: 'transcript', started: '2026-11-10T12:00:02.000Z', text: 'and again' },
    ]);

    await manager.leave();
    transport.emitTranscript({ text: 'after leaving' });
    expect(segments).toHaveLength(2);
    await manager.close();
  });

  test('moves to the meeting the swarm agreed on when two peers raced into an empty room', async ({ expect }) => {
    const { manager, transports, network } = await setup();
    manager.setRoomId(ROOM_ID);
    await manager.join();
    expect(transports[0].transport.meetingId).toBe('meeting-1');

    // The remote peer's advertisement wins last-write-wins (a later version).
    network.emitSwarmEvent(swarmEvent([peer(SELF_DEVICE), peer(REMOTE_DEVICE, 'meeting-remote', 5)]));
    await waitForCondition({ condition: () => transports.length === 2, timeout: 3_000 });

    expect(transports[1].options).toEqual({ roomId: ROOM_ID, meetingId: 'meeting-remote' });
    expect(transports[0].transport.isOpen).toBe(false);
    expect(transports[1].transport.isOpen).toBe(true);

    await manager.close();
  });

  test('returns to its meeting when the one the swarm agreed on cannot be joined', async ({ expect }) => {
    const { manager, transports, network } = await setup({ unreachable: 'meeting-gone' });
    manager.setRoomId(ROOM_ID);
    await manager.join();

    network.emitSwarmEvent(swarmEvent([peer(SELF_DEVICE), peer(REMOTE_DEVICE, 'meeting-gone', 5)]));
    await waitForCondition({ condition: () => transports.length === 3, timeout: 3_000 });

    expect(transports.map(({ options }) => options.meetingId)).toEqual([undefined, 'meeting-gone', 'meeting-1']);
    expect(transports[2].transport.isOpen).toBe(true);
    expect(manager.joined).toBe(true);

    // Further state updates do not retry the meeting that failed.
    network.emitSwarmEvent(swarmEvent([peer(SELF_DEVICE), peer(REMOTE_DEVICE, 'meeting-gone', 6)]));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(transports).toHaveLength(3);

    await manager.close();
  });

  test('leaves when the meeting ends and rejoins it when the connection is lost', async ({ expect }) => {
    const { manager, transports } = await setup();
    manager.setRoomId(ROOM_ID);
    await manager.join();

    transports[0].transport.closed.emit('lost');
    await waitForCondition({ condition: () => transports.length === 2, timeout: 3_000 });
    expect(transports[1].options.meetingId).toBe('meeting-1');
    expect(manager.joined).toBe(true);

    transports[1].transport.closed.emit('ended');
    await waitForCondition({ condition: () => !manager.joined, timeout: 3_000 });
    expect(transports[1].transport.isOpen).toBe(false);

    await manager.close();
  });
});

type MockNetwork = {
  service: CallNetworkService;
  emitSwarmEvent: (event: SwarmResponse) => void;
  setQueryPeers: (peers: SwarmResponse['peers']) => void;
};

const createMockNetwork = (): MockNetwork => {
  let onSwarmEvent: ((event: SwarmResponse) => void) | undefined;
  let queryPeers: SwarmResponse['peers'] = [];
  return {
    service: {
      subscribeSwarmState: () =>
        new Stream<SwarmResponse>(({ next }) => {
          onSwarmEvent = next;
        }),
      joinSwarm: async () => {},
      leaveSwarm: async () => {},
      querySwarm: async () => swarmEvent(queryPeers),
    },
    emitSwarmEvent: (event) => onSwarmEvent?.(event),
    setQueryPeers: (peers) => {
      queryPeers = peers;
    },
  };
};

const identity: Pick<Identity.ServiceApi, 'subscribe' | 'getDevicesSnapshot'> = {
  subscribe: (callback) => {
    callback(Option.some({ did: IdentityDid.random(), displayName: 'Tester' }));
    return () => {};
  },
  getDevicesSnapshot: () => [{ key: SELF_DEVICE, current: true }],
};

const setup = async ({ unreachable }: { unreachable?: string } = {}) => {
  const network = createMockNetwork();
  const registry = AtomRegistry.make();
  const transports: { options: CreateTransportOptions; transport: FakeTransport }[] = [];
  const manager = new CallManager({
    registry,
    identity,
    networkService: network.service,
    createTransport: (options) => {
      const transport = new FakeTransport({
        meetingId: options.meetingId ?? `meeting-${transports.length + 1}`,
        failOpen: options.meetingId !== undefined && options.meetingId === unreachable,
      });
      transports.push({ options, transport });
      return transport;
    },
  });
  await manager.open();
  const advertised = (): unknown => registry.get(manager.activityAtom(MEETING_ACTIVITY_KEY))?.payload?.meetingId;
  return { manager, transports, network, advertised };
};

const swarmEvent = (peers: SwarmResponse['peers']): SwarmResponse => buf.create(SwarmResponseSchema, { peers });

/** Encodes a peer entry the way the synchronizer broadcasts it. */
const peer = (id: string, meetingId?: string, version = 1) =>
  buf.create(PeerSchema, {
    peerKey: id,
    connectionState: ConnectionState.CONNECTED,
    state: codec.encode({
      id,
      joined: true,
      activities: meetingId
        ? {
            [MEETING_ACTIVITY_KEY]: buf.create(ActivitySchema, {
              lamportTimestamp: { id, version },
              payload: { meetingId },
            }),
          }
        : {},
    }),
  });
