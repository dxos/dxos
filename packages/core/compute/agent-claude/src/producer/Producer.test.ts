//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Feed } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';

import * as Producer from './Producer.ts';

describe('Producer', () => {
  test('exposes the turn-producer shape the agent process drives', async () => {
    const producer = await EffectEx.runPromise(Producer.make({ feed: Feed.make() }));
    expect(typeof producer.runTurn).to.eq('function');
    // The process fires end-request hooks against these; the SDK binds its own tools, so none.
    expect(producer.getSkills()).to.deep.eq([]);
  });

  test('a request is a description, not a running turn', async () => {
    const producer = await EffectEx.runPromise(Producer.make({ feed: Feed.make() }));
    // Effect is lazy, so building the request must not reach the host — the process decides when
    // (and whether) to run it, and cancels by interrupting.
    expect(() => producer.runTurn({ prompt: 'hello' })).not.to.throw();
  });
});
