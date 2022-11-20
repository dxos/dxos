//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';

import { Agent } from './agent';

describe('Agent', function () {
  // TODO(burdon): Run local signal server.
  it('create and starts a basic agent', async function () {
    const agent = new Agent({ version: 1 });
    await agent.initialize();

    // TODO(burdon): Define actions/state machines (e.g., CreateSpace, CreateInvitation, AcceptInvitation, MutateSpace).
    await agent.start();
    expect(agent.started).to.be.true;
    await agent.stop();
    await agent.destroy();
  });
});
