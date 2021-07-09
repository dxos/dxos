//
// Copyright 2021 DXOS.org
//

import { it as test } from 'mocha';

import { Orchestrator } from './orchestrator';

describe('Orchestrator', () => {
  test('start & stop', async () => {
    const orchestrator = await Orchestrator.create({ local: true });

    await orchestrator.start();

    await orchestrator.destroy();
  });
});
