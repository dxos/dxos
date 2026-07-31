//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Obj } from '@dxos/echo';

import { FreeqChannel, makeFreeqChannel } from './types';

describe('FreeqChannel', () => {
  test('makeFreeqChannel builds a config object', ({ expect }) => {
    const channel = makeFreeqChannel({
      serverUrl: 'wss://freeq.example',
      channel: '#general',
      handle: 'alice.bsky.social',
    });
    expect(Obj.instanceOf(FreeqChannel, channel)).toBe(true);
    expect(channel.serverUrl).toBe('wss://freeq.example');
    expect(channel.channel).toBe('#general');
    expect(channel.handle).toBe('alice.bsky.social');
  });

  test('handle is optional', ({ expect }) => {
    const channel = makeFreeqChannel({ serverUrl: 'wss://freeq.example', channel: '#general' });
    expect(channel.handle).toBeUndefined();
  });
});
