//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ConnectionManager } from './ConnectionManager';
import { type IrcConnection } from './IrcConnection';

const makeFakeConnection = (options?: {
  connect?: () => Promise<void>;
}): IrcConnection & {
  closed: number;
  connects: number;
} => {
  const state = { closed: 0, connects: 0 };
  return {
    ...state,
    connect: async () => {
      state.connects++;
      await options?.connect?.();
    },
    join: async () => {},
    part: () => {},
    sendMessage: () => {},
    onMessage: () => () => {},
    close: () => void state.closed++,
    get closed() {
      return state.closed;
    },
    get connects() {
      return state.connects;
    },
  } as any;
};

describe('ConnectionManager', () => {
  test('shares one connection across acquires with the same key', ({ expect }) => {
    let created = 0;
    const manager = new ConnectionManager({
      makeConnection: () => {
        created++;
        return makeFakeConnection();
      },
    });
    const params = { serverUrl: 'wss://s', identityKey: 'did:a', nick: 'a', runResponse: async () => '' };
    const a = manager.acquire(params);
    const b = manager.acquire(params);
    expect(created).toBe(1);
    expect(a.connection).toBe(b.connection);
  });

  test('closes the connection only when the last handle is released', ({ expect }) => {
    const fake = makeFakeConnection();
    const manager = new ConnectionManager({ makeConnection: () => fake });
    const params = { serverUrl: 'wss://s', identityKey: 'did:a', nick: 'a', runResponse: async () => '' };
    const a = manager.acquire(params);
    const b = manager.acquire(params);
    a.release();
    expect(fake.closed).toBe(0);
    b.release();
    expect(fake.closed).toBe(1);
  });

  test('creates distinct connections for distinct identities', ({ expect }) => {
    let created = 0;
    const manager = new ConnectionManager({
      makeConnection: () => {
        created++;
        return makeFakeConnection();
      },
    });
    manager.acquire({ serverUrl: 'wss://s', identityKey: 'did:a', nick: 'a', runResponse: async () => '' });
    manager.acquire({ serverUrl: 'wss://s', identityKey: 'did:b', nick: 'b', runResponse: async () => '' });
    expect(created).toBe(2);
  });

  test('evicts the entry when connect() rejects, so the next acquire creates a fresh connection', async ({
    expect,
  }) => {
    let created = 0;
    const connections: any[] = [];
    const manager = new ConnectionManager({
      makeConnection: () => {
        created++;
        const fake = makeFakeConnection({ connect: () => Promise.reject(new Error('sasl failed')) });
        connections.push(fake);
        return fake;
      },
    });
    const params = { serverUrl: 'wss://s', identityKey: 'did:a', nick: 'a', runResponse: async () => '' };
    manager.acquire(params);
    expect(created).toBe(1);

    // Let the rejected connect() promise settle and the eviction handler run.
    await new Promise((resolve) => setTimeout(resolve, 0));

    manager.acquire(params);
    expect(created).toBe(2);
    expect(connections[0]).not.toBe(connections[1]);
  });

  test('creates a fresh connection after acquire + full release', ({ expect }) => {
    let created = 0;
    const manager = new ConnectionManager({
      makeConnection: () => {
        created++;
        return makeFakeConnection();
      },
    });
    const params = { serverUrl: 'wss://s', identityKey: 'did:a', nick: 'a', runResponse: async () => '' };
    const first = manager.acquire(params);
    first.release();
    expect(created).toBe(1);

    const second = manager.acquire(params);
    expect(created).toBe(2);
    expect(second.connection).not.toBe(first.connection);
  });
});
