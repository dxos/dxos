//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

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
    await backend.send(channel, toMessage({ id: 'x', nick: 'me', text: 'hi', ts: 1 })).pipe(Effect.runPromise);
    expect(sent).toEqual([['#c', 'hi']]);
  });
});
