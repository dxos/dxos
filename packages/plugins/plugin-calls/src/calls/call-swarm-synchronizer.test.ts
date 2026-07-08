//
// Copyright 2026 DXOS.org
//

// @vitest-environment happy-dom

import { describe, test } from 'vitest';

import { type Identity } from '@dxos/client/halo';
import { PublicKey } from '@dxos/keys';
import { buf } from '@dxos/protocols/buf';
import { ActivitySchema } from '@dxos/protocols/buf/dxos/edge/calls_pb';
import { Device, DeviceKind, type NetworkService } from '@dxos/protocols/proto/dxos/client/services';
import { ConnectionState, type SwarmResponse } from '@dxos/protocols/proto/dxos/edge/messenger';

import { CallSwarmSynchronizer, MEETING_ACTIVITY_KEY } from './call-swarm-synchronizer';
import { codec } from './types';

const IDENTITY_KEY = PublicKey.random();
const SELF_DEVICE = PublicKey.random();
const REMOTE_DEVICE = PublicKey.random();
const ROOM_ID = 'room-under-test';

describe('CallSwarmSynchronizer', () => {
  test('does not re-adopt its own stale advertisement after leave and rejoin', async ({ expect }) => {
    const { network, synchronizer } = await setup();
    synchronizer.setJoined(true);
    await synchronizer.join();
    synchronizer.advertiseMeetingId('M-live');
    expect(advertisedMeetingId(synchronizer)).toBe('M-live');

    // Mirrors CallManager.leave(): presence flips before the swarm teardown.
    synchronizer.setJoined(false);
    await synchronizer.leave();
    expect(advertisedMeetingId(synchronizer)).toBeUndefined();

    // Rejoin; the first snapshot can still contain our own pre-leave entry (the swarm leave is
    // fire-and-forget), advertising the meeting that was just torn down.
    synchronizer.setJoined(true);
    await synchronizer.join();
    const reconciled = synchronizer.stateUpdated.waitForCount(1);
    network.emitSwarmEvent({ swarmKey: ROOM_ID, peers: [peer(SELF_DEVICE, 'M-stale', 5)] });
    await reconciled;
    expect(advertisedMeetingId(synchronizer)).toBeUndefined();

    synchronizer.setJoined(false);
    await synchronizer.leave();
    await synchronizer.close();
  });

  test('adopts a remote peer advertisement via reconcile', async ({ expect }) => {
    const { network, synchronizer } = await setup();
    synchronizer.setJoined(true);
    await synchronizer.join();

    const reconciled = synchronizer.stateUpdated.waitForCount(1);
    network.emitSwarmEvent({ swarmKey: ROOM_ID, peers: [peer(SELF_DEVICE), peer(REMOTE_DEVICE, 'M-remote')] });
    await reconciled;
    expect(advertisedMeetingId(synchronizer)).toBe('M-remote');

    synchronizer.setJoined(false);
    await synchronizer.leave();
    await synchronizer.close();
  });

  test('a reconcile landing after leave does not repopulate state', async ({ expect }) => {
    const { network, synchronizer } = await setup();
    synchronizer.setJoined(true);
    await synchronizer.join();

    // Schedule a reconcile from a snapshot containing our own advertisement, then leave before it
    // runs: the straggler must be a no-op against the cleared state.
    network.emitSwarmEvent({ swarmKey: ROOM_ID, peers: [peer(SELF_DEVICE, 'M-stale', 5)] });
    synchronizer.setJoined(false);
    await synchronizer.leave();

    // One macrotask tick so the already-scheduled reconcile task gets to run; the assertion is that
    // nothing happens, which no event can signal.
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(synchronizer._getState().users).toBeUndefined();
    expect(advertisedMeetingId(synchronizer)).toBeUndefined();
    await synchronizer.close();
  });

  test('resolveMeetingId ignores our own stale advertisement', async ({ expect }) => {
    const { network, synchronizer } = await setup();

    // Alone in the swarm with only our own stale echo: mint fresh (resolve to undefined).
    network.setQueryPeers([peer(SELF_DEVICE, 'M-stale', 5)]);
    expect(await synchronizer.resolveMeetingId(ROOM_ID)).toBeUndefined();

    // A remote advertisement is still honored.
    network.setQueryPeers([peer(SELF_DEVICE, 'M-stale', 5), peer(REMOTE_DEVICE, 'M-remote')]);
    expect(await synchronizer.resolveMeetingId(ROOM_ID)).toBe('M-remote');

    await synchronizer.close();
  });
});

type MockNetwork = {
  service: NetworkService;
  emitSwarmEvent: (event: SwarmResponse) => void;
  setQueryPeers: (peers: NonNullable<SwarmResponse['peers']>) => void;
};

const createMockNetworkService = (): MockNetwork => {
  let onSwarmEvent: ((event: SwarmResponse) => void) | undefined;
  let queryPeers: NonNullable<SwarmResponse['peers']> = [];
  const service = {
    subscribeSwarmState: () => ({
      subscribe: (handler: (event: SwarmResponse) => void) => {
        onSwarmEvent = handler;
      },
      close: async () => {},
    }),
    joinSwarm: async () => ({}),
    leaveSwarm: async () => ({}),
    querySwarm: async () => ({ swarmKey: ROOM_ID, peers: queryPeers }),
    // Test double: only the members `CallSwarmSynchronizer` touches exist; the full proto service
    // surface is out of scope here.
  } as unknown as NetworkService;

  return {
    service,
    emitSwarmEvent: (event) => onSwarmEvent?.(event),
    setQueryPeers: (peers) => {
      queryPeers = peers;
    },
  };
};

const setup = async (): Promise<{ network: MockNetwork; synchronizer: CallSwarmSynchronizer }> => {
  const network = createMockNetworkService();
  const synchronizer = new CallSwarmSynchronizer({ networkService: network.service });
  await synchronizer.open();
  const identity: Identity = { did: 'did:key:test', identityKey: IDENTITY_KEY, profile: { displayName: 'Tester' } };
  synchronizer._setIdentity(identity);
  synchronizer._setDevice({ deviceKey: SELF_DEVICE, kind: DeviceKind.CURRENT, presence: Device.PresenceState.ONLINE });
  synchronizer._setRoomId(ROOM_ID);
  return { network, synchronizer };
};

/** Encodes a peer entry the way `_sendState` broadcasts it. */
const peer = (deviceKey: PublicKey, meetingId?: string, version = 1) => ({
  peerKey: deviceKey.toHex(),
  connectionState: ConnectionState.CONNECTED,
  state: codec.encode({
    id: deviceKey.toHex(),
    activities: meetingId
      ? {
          [MEETING_ACTIVITY_KEY]: buf.create(ActivitySchema, {
            lamportTimestamp: { id: deviceKey.toHex(), version },
            payload: { meetingId },
          }),
        }
      : {},
  }),
});

const advertisedMeetingId = (synchronizer: CallSwarmSynchronizer): unknown =>
  synchronizer._getState().activities?.[MEETING_ACTIVITY_KEY]?.payload?.meetingId;
