//
// Copyright 2024 DXOS.org
//

import { describe, test } from 'vitest';

import { AndGate } from './state-machine';

// TODO(burdon): Compute node.

describe('state machine', () => {
  test('construct', async ({ expect }) => {
    const node = new AndGate();
    const result = await node.run([true, true, false]);
    expect(result).to.be.false;
  });
});
