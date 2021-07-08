//
// Copyright 2021 DXOS.org
//

import expect from 'expect';
import { it as test } from 'mocha';

import { buildBot } from './distributor';
import { AGENT_PATH } from './tests/agent';

describe('build bot', () => {
  test('node', async () => {
    const path = await buildBot(AGENT_PATH, false);

    expect(typeof path).toEqual('string');
  });

  test('browser', async () => {
    const path = await buildBot(AGENT_PATH, true);

    expect(typeof path).toEqual('string');
  });
});
