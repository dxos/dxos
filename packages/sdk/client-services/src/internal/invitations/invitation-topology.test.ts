//
// Copyright 2026 DXOS.org
//

import { describe, expect, onTestFinished, test, vi } from 'vitest';

import { PublicKey } from '@dxos/keys';
import { type SwarmController, type SwarmState } from '@dxos/network-manager';
import { InvitationOptions_Role } from '@dxos/protocols/buf/dxos/halo/invitations_pb';

import { InvitationTopology } from './invitation-topology.ts';

describe('InvitationTopology', () => {
  const setup = (role = InvitationOptions_Role.HOST) => {
    const state: SwarmState = { ownPeerId: PublicKey.random(), connected: [], candidates: [], allPeers: [] };
    const without = (peers: PublicKey[], peer: PublicKey) => peers.filter((other) => !other.equals(peer));
    // Like the swarm, connect() only schedules a connection; the test decides when it exists.
    const connect = vi.fn<(peer: PublicKey) => void>();
    const controller: SwarmController = {
      getState: () => ({
        ownPeerId: state.ownPeerId,
        connected: [...state.connected],
        candidates: [...state.candidates],
        allPeers: [...state.allPeers],
      }),
      connect,
      disconnect: vi.fn(),
    };
    const topology = new InvitationTopology(role);
    topology.init(controller);
    onTestFinished(() => topology.destroy());

    /** A peer joins the swarm and advertizes. */
    const join = (peer: PublicKey) => {
      state.allPeers = [...state.allPeers, peer];
      state.candidates = [...state.candidates, peer];
      topology.update();
    };

    /** The peer leaves the swarm before any connection to it exists. */
    const leave = (peer: PublicKey) => {
      state.allPeers = without(state.allPeers, peer);
      state.candidates = without(state.candidates, peer);
      topology.update();
    };

    /** The swarm creates a connection to the peer, from a dial or an accepted offer. */
    const openSession = (peer: PublicKey) => {
      state.candidates = without(state.candidates, peer);
      state.connected = [...state.connected, peer];
      topology.update();
    };

    /** The peer offers a connection, and the swarm creates it if the topology accepts. */
    const offer = async (peer: PublicKey) => {
      const accepted = await topology.onOffer(peer);
      if (accepted) {
        state.allPeers = [...state.allPeers, peer];
        openSession(peer);
      }
      return accepted;
    };

    /** The session closed and the peer's backoff elapsed. */
    const closeSession = (peer: PublicKey) => {
      state.connected = without(state.connected, peer);
      topology.update();
      state.candidates = [...state.candidates, peer];
      topology.update();
    };

    return { connect, topology, join, leave, offer, openSession, closeSession };
  };

  test('updates before the session opens cost one dial, and a failed session is dialed again', () => {
    const { connect, topology, join, openSession, closeSession } = setup();
    const guest = PublicKey.random();

    join(guest);
    topology.update();
    topology.update();
    expect(connect).toHaveBeenCalledTimes(1);

    openSession(guest);
    closeSession(guest);
    expect(connect).toHaveBeenCalledTimes(2);
    expect(connect).toHaveBeenLastCalledWith(guest);
  });

  test('a host dials no other peer while a dial is pending', () => {
    const { connect, join, leave } = setup();
    const [first, second] = [PublicKey.random(), PublicKey.random()];

    join(first);
    join(second);
    expect(connect).toHaveBeenCalledTimes(1);
    expect(connect).toHaveBeenLastCalledWith(first);

    leave(first);
    expect(connect).toHaveBeenCalledTimes(2);
    expect(connect).toHaveBeenLastCalledWith(second);
  });

  test('a host stops dialing a guest after three sessions, and refuses its offers', async () => {
    const { connect, topology, join, openSession, closeSession } = setup();
    const guest = PublicKey.random();

    join(guest);
    for (const dials of [1, 2, 3]) {
      topology.update();
      expect(connect).toHaveBeenCalledTimes(dials);
      openSession(guest);
      closeSession(guest);
    }

    expect(connect).toHaveBeenCalledTimes(3);
    expect(await topology.onOffer(guest)).toBe(false);
  });

  test('a refused offer from a pending peer releases its dial', async () => {
    const { connect, offer, join, openSession, closeSession } = setup();
    const [capped, waiting] = [PublicKey.random(), PublicKey.random()];

    join(capped);
    openSession(capped);
    closeSession(capped);
    openSession(capped);
    closeSession(capped);
    expect(await offer(capped)).toBe(false);

    join(waiting);
    expect(connect.mock.calls).toEqual([[capped], [capped], [capped], [waiting]]);
  });

  test('a peer that proved to be a host is not dialed, and its offers are refused', async () => {
    const { connect, topology, offer, closeSession } = setup();
    const host = PublicKey.random();

    expect(await offer(host)).toBe(true);
    topology.retire(host);
    closeSession(host);

    expect(connect).not.toHaveBeenCalled();
    expect(await offer(host)).toBe(false);
  });

  test('an admitted guest is not dialed again, and its offers are refused', async () => {
    const { connect, topology, join, openSession, closeSession } = setup();
    const [admitted, waiting] = [PublicKey.random(), PublicKey.random()];

    join(admitted);
    openSession(admitted);
    topology.retire(admitted);
    closeSession(admitted);
    expect(connect).toHaveBeenCalledTimes(1);

    join(waiting);
    expect(connect.mock.calls).toEqual([[admitted], [waiting]]);
    expect(await topology.onOffer(admitted)).toBe(false);
  });

  test('a guest never dials', () => {
    const { connect, join, openSession, closeSession } = setup(InvitationOptions_Role.GUEST);
    const host = PublicKey.random();

    join(host);
    openSession(host);
    closeSession(host);
    expect(connect).not.toHaveBeenCalled();
  });
});
