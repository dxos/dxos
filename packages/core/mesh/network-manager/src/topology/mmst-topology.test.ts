//
// Copyright 2026 DXOS.org
//

import { describe, expect, onTestFinished, test, vi } from 'vitest';

import { PublicKey } from '@dxos/keys';

import { MIN_UPDATE_INTERVAL, MMSTTopology } from './mmst-topology.ts';
import { type SwarmController, type SwarmState } from './topology.ts';

describe('MMSTTopology', () => {
  const setup = () => {
    vi.useFakeTimers();

    const peer = PublicKey.random();
    const state: SwarmState = {
      ownPeerId: PublicKey.random(),
      connected: [],
      candidates: [peer],
      allPeers: [peer],
    };
    const connect = vi.fn((key: PublicKey) => {
      state.candidates = state.candidates.filter((candidate) => !candidate.equals(key));
      state.connected = [...state.connected, key];
    });
    const controller: SwarmController = {
      getState: () => ({ ...state, connected: [...state.connected], candidates: [...state.candidates] }),
      connect,
      disconnect: vi.fn(),
    };
    const topology = new MMSTTopology({ originateConnections: 1 });
    topology.init(controller);
    onTestFinished(async () => {
      await topology.destroy();
      vi.useRealTimers();
    });

    /** The connection to the peer failed and the peer is available again. */
    const failConnection = () => {
      state.connected = [];
      state.candidates = [peer];
      topology.update();
    };

    return { peer, state, connect, topology, failConnection };
  };

  test('a rate-limited connect runs once the interval passes', async () => {
    const { peer, connect, topology, failConnection } = setup();

    topology.update();
    expect(connect).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(100);
    failConnection();
    failConnection();
    expect(connect).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(1);

    vi.advanceTimersByTime(MIN_UPDATE_INTERVAL - 101);
    expect(connect).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);
    expect(connect).toHaveBeenCalledTimes(2);
    expect(connect).toHaveBeenLastCalledWith(peer);
    expect(vi.getTimerCount()).toBe(0);
  });

  test('a pass with no candidates does not consume the interval', () => {
    const { state, connect, topology, failConnection } = setup();

    topology.update();
    expect(connect).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(MIN_UPDATE_INTERVAL + 1);
    state.connected = [];
    state.candidates = [];
    topology.update();

    vi.advanceTimersByTime(50);
    failConnection();
    expect(connect).toHaveBeenCalledTimes(2);
  });

  test('a deferred update does not run after destroy', async () => {
    const { connect, topology, failConnection } = setup();

    topology.update();
    failConnection();
    expect(vi.getTimerCount()).toBe(1);

    await topology.destroy();
    expect(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(2 * MIN_UPDATE_INTERVAL);
    expect(connect).toHaveBeenCalledTimes(1);
  });
});
