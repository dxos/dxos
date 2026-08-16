//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Feed } from '@dxos/echo';

import * as Producer from './Producer';

describe('Producer', () => {
  test('exposes the turn-producer shape the agent process drives', () => {
    const producer = Producer.make({ feed: Feed.make() });
    expect(typeof producer.createRequest).to.eq('function');
    // The process fires end-request hooks against these; the SDK binds its own tools, so none.
    expect(producer.getSkills()).to.deep.eq([]);
  });

  test('a request is a description, not a running turn', () => {
    const producer = Producer.make({ feed: Feed.make() });
    // Effect is lazy, so building the request must not reach the host — the process decides when
    // (and whether) to run it, and cancels by interrupting.
    expect(() => producer.createRequest({ prompt: 'hello' })).not.to.throw();
  });
});
