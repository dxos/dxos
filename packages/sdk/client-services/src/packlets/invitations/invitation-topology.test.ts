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
    const guest = PublicKey.random();
    const state: SwarmState = {
      ownPeerId: PublicKey.random(),
      connected: [],
      candidates: [guest],
      allPeers: [guest],
    };
    const connect = vi.fn((peer: PublicKey) => {
      state.candidates = state.candidates.filter((candidate) => !candidate.equals(peer));
      state.connected = [...state.connected, peer];
    });
    const controller: SwarmController = {
      getState: () => ({ ...state, connected: [...state.connected], candidates: [...state.candidates] }),
      connect,
      disconnect: vi.fn(),
    };
    const topology = new InvitationTopology(role);
    topology.init(controller);
    onTestFinished(() => topology.destroy());

    /** The session with the guest closed before the invitation finished, and its backoff elapsed. */
    const closeSession = () => {
      state.connected = [];
      state.candidates = [guest];
      topology.update();
    };

    return { guest, state, connect, topology, closeSession };
  };

  test('a host dials a guest again after its session closes', () => {
    const { guest, connect, topology, closeSession } = setup();

    topology.update();
    expect(connect).toHaveBeenCalledTimes(1);

    closeSession();
    expect(connect).toHaveBeenCalledTimes(2);
    expect(connect).toHaveBeenLastCalledWith(guest);
  });

  test('updates during a live session do not use up dials', () => {
    const { connect, topology, closeSession } = setup();

    topology.update();
    topology.update();
    topology.update();
    closeSession();
    expect(connect).toHaveBeenCalledTimes(2);
  });

  test('a host stops dialing a guest after three sessions, and refuses its offers', async ({ expect }) => {
    const { guest, connect, topology, closeSession } = setup();

    topology.update();
    closeSession();
    expect(await topology.onOffer(guest)).toBe(true);
    closeSession();
    closeSession();
    expect(connect).toHaveBeenCalledTimes(3);
    expect(await topology.onOffer(guest)).toBe(false);
  });

  test('a guest never dials', () => {
    const { connect, topology, closeSession } = setup(InvitationOptions_Role.GUEST);

    topology.update();
    closeSession();
    expect(connect).not.toHaveBeenCalled();
  });
});
