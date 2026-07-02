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

// `send`'s declared return type fixes its Effect requirement to `Capability.Service`; provide a
// real (empty) manager to discharge it even though these backend implementations never read it.
const withCapabilityService = <A, E>(effect: Effect.Effect<A, E, Capability.Service>): Promise<A> =>
  effect.pipe(
    Effect.provideService(Capability.Service, CapabilityManager.make({ registry: Registry.make() })),
    Effect.runPromise,
  );

describe('freeq channel backend', () => {
  test('toMessage maps an incoming IRC message to a chat message', ({ expect }) => {
    const incoming: IncomingMessage = { id: 'm1', nick: 'bob', text: 'hello', ts: 1700000000000 };
    const message = toMessage(incoming);
    expect(message.sender.name).toBe('bob');
    expect(message.blocks[0]).toMatchObject({ _tag: 'text', text: 'hello' });
  });

  test('send delegates a PRIVMSG to the acquired connection', async ({ expect }) => {
    const sent: Array<[string, string]> = [];
    const fakeConnection = {
      connect: async () => {},
      join: async () => {},
      part: () => {},
      sendMessage: (channel: string, text: string) => sent.push([channel, text]),
      onMessage: () => () => {},
      close: () => {},
    };
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

  test('send passes a credentialProvider to acquire when lookupCredential resolves a handle', async ({ expect }) => {
    const acquireCalls: any[] = [];
    const fakeConnection = {
      connect: async () => {},
      join: async () => {},
      part: () => {},
      sendMessage: () => {},
      onMessage: () => () => {},
      close: () => {},
    };
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

    const lookupCredential = (handle: string) =>
      handle === 'alice.example' ? { appPassword: 'app-pass', pdsUrl: 'https://pds.example' } : undefined;

    const backend = makeFreeqChannelBackend(manager, lookupCredential);
    await withCapabilityService(backend.send(channel, toMessage({ id: 'x', nick: 'me', text: 'hi', ts: 1 })));

    expect(acquireCalls).toHaveLength(1);
    expect(acquireCalls[0].credentialProvider).toBeDefined();
  });
});
