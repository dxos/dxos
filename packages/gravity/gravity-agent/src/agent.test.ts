//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';

import { Agent } from './agent';

describe('Agent', function () {
  it('create and starts a basic agent', async function () {
    const agent = new Agent({ version: 1 });
    await agent.initialize();
    await agent.start();
    expect(agent.started).to.be.true;
    await agent.destroy();
  });
});
