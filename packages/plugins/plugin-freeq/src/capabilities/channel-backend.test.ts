//
// Copyright 2026 DXOS.org
//

import { Registry } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import { Capability, CapabilityManager } from '@dxos/app-framework';

import { type IncomingMessage } from '../services';
import { makeFreeqChannel } from '../types';
import { makeFreeqChannelBackend, toMessage } from './channel-backend';

describe('freeq channel backend', () => {
  test('toMessage maps an incoming IRC message to a chat message', ({ expect }) => {
    const incoming: IncomingMessage = { id: 'm1', nick: 'bob', text: 'hello', ts: 1700000000000 };
    const message = toMessage(incoming);
    expect(message.sender.name).toBe('bob');
    expect(message.blocks[0]).toMatchObject({ _tag: 'text', text: 'hello' });
  });

  test('send delegates a PRIVMSG to the acquired connection', async ({ expect }) => {
    const sent: Array<[string, string]> = [];
    const fakeConnection = makeFakeConnection({
      sendMessage: async (channel, text) => {
        sent.push([channel, text]);
      },
    });
    const manager = { acquire: () => ({ connection: fakeConnection, release: () => {} }) } as any;

    // A real FreeqChannel (branded via `Obj.instanceOf`) resolved by a Channel-shaped stub.
    const channel = {
      backend: {
        kind: 'org.dxos.channel.backend.freeq',
        config: { load: async () => makeFreeqChannel({ serverUrl: 'wss://s', channel: '#c' }) },
      },
    } as any;

    const backend = makeFreeqChannelBackend(manager);
    await withCapabilityService(backend.send(channel, toMessage({ id: 'x', nick: 'me', text: 'hi', ts: 1 })));
    expect(sent).toEqual([['#c', 'hi']]);
  });

  test('send releases the connection only after sendMessage resolves', async ({ expect }) => {
    const order: string[] = [];
    let resolveSend: () => void = () => {};
    const fakeConnection = makeFakeConnection({
      sendMessage: () =>
        new Promise<void>((resolve) => {
          resolveSend = () => {
            order.push('sendMessage');
            resolve();
          };
        }),
    });
    const manager = {
      acquire: () => ({ connection: fakeConnection, release: () => order.push('release') }),
    } as any;

    const channel = {
      backend: {
        kind: 'org.dxos.channel.backend.freeq',
        config: { load: async () => makeFreeqChannel({ serverUrl: 'wss://s', channel: '#c' }) },
      },
    } as any;

    const backend = makeFreeqChannelBackend(manager);
    const done = withCapabilityService(backend.send(channel, toMessage({ id: 'x', nick: 'me', text: 'hi', ts: 1 })));

    // release() must not have happened yet: sendMessage's promise is still pending.
    await Promise.resolve();
    await Promise.resolve();
    expect(order).toEqual([]);

    resolveSend();
    await done;

    expect(order).toEqual(['sendMessage', 'release']);
  });

  test('send passes a credentialProvider to acquire when lookupCredential resolves a handle', async ({ expect }) => {
    const acquireCalls: any[] = [];
    const fakeConnection = makeFakeConnection();
    const manager = {
      acquire: (params: any) => {
        acquireCalls.push(params);
        return { connection: fakeConnection, release: () => {} };
      },
    } as any;

    const channel = {
      backend: {
        kind: 'org.dxos.channel.backend.freeq',
        config: {
          load: async () => makeFreeqChannel({ serverUrl: 'wss://s', channel: '#c', handle: 'alice.example' }),
        },
      },
    } as any;

    const lookupCredential = (handle: string) => (handle === 'alice.example' ? { appPassword: 'app-pass' } : undefined);

    const backend = makeFreeqChannelBackend(manager, lookupCredential);
    await withCapabilityService(backend.send(channel, toMessage({ id: 'x', nick: 'me', text: 'hi', ts: 1 })));

    expect(acquireCalls).toHaveLength(1);
    expect(acquireCalls[0].credentialProvider).toBeDefined();
  });

  test('subscribe emits an empty list, without an unhandled rejection, when config.load() fails', async ({
    expect,
  }) => {
    const emitted: Array<readonly unknown[]> = [];
    const manager = { acquire: () => ({ connection: makeFakeConnection(), release: () => {} }) } as any;
    const channel = {
      backend: {
        kind: 'org.dxos.channel.backend.freeq',
        config: { load: () => Promise.reject(new Error('load failed')) },
      },
    } as any;

    const backend = makeFreeqChannelBackend(manager);
    const unsubscribe = backend.subscribe(channel, (messages) => emitted.push(messages));

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(emitted).toEqual([[]]);
    unsubscribe();
  });

  test('subscribe does not throw an unhandled rejection when join() fails', async ({ expect }) => {
    const fakeConnection = { ...makeFakeConnection(), join: () => Promise.reject(new Error('join failed')) };
    const manager = { acquire: () => ({ connection: fakeConnection, release: () => {} }) } as any;
    const channel = {
      backend: {
        kind: 'org.dxos.channel.backend.freeq',
        config: { load: async () => makeFreeqChannel({ serverUrl: 'wss://s', channel: '#c' }) },
      },
    } as any;

    const backend = makeFreeqChannelBackend(manager);
    const unsubscribe = backend.subscribe(channel, () => {});

    // A rejected join() promise reaching the test runner unhandled would fail this test.
    await new Promise((resolve) => setTimeout(resolve, 0));

    unsubscribe();
  });
});

/** Minimal `IrcConnection`-shaped stub; overrides let tests observe/control individual methods. */
const makeFakeConnection = (overrides?: {
  sendMessage?: (channel: string, text: string) => Promise<void>;
}): {
  connect: () => Promise<void>;
  join: () => Promise<void>;
  part: () => void;
  sendMessage: (channel: string, text: string) => Promise<void>;
  onMessage: () => () => void;
  close: () => void;
} => ({
  connect: async () => {},
  join: async () => {},
  part: () => {},
  sendMessage: overrides?.sendMessage ?? (async () => {}),
  onMessage: () => () => {},
  close: () => {},
});

// `send`'s declared return type fixes its Effect requirement to `Capability.Service`; provide a
// real (empty) manager to discharge it even though these backend implementations never read it.
const withCapabilityService = <A, E>(effect: Effect.Effect<A, E, Capability.Service>): Promise<A> =>
  effect.pipe(
    Effect.provideService(Capability.Service, CapabilityManager.make({ registry: Registry.make() })),
    Effect.runPromise,
  );
