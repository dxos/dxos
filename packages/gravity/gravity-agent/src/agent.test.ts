//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';

import { ConfigProto } from '@dxos/config';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

import { Agent } from './agent';

// TODO(burdon): Run local signal server for tests.
describe('Agent', function () {
  it('creates and starts a basic agent', async function () {
    const config: ConfigProto = { version: 1 };
    const agent = new Agent(config);
    await agent.initialize();
    expect(agent.client).to.exist;
    expect(agent.started).to.be.false;
    await agent.start();
    expect(agent.started).to.be.true;
    await agent.stop();
    expect(agent.started).to.be.false;
    await agent.destroy();
  });

  it.only('creates a space', async function () {
    const config: ConfigProto = { version: 1 };
    const agent = new Agent(config);
    await agent.initialize();
    const space = await agent.client!.echo.createSpace();
    expect(space.key).to.exist;
    await agent.destroy();
  });

  it('creates agents and shares space invitation', async function () {
    const config: ConfigProto = { version: 1 };
    const swarmKey = PublicKey.random();

    {
      const agent = new Agent(config);
      await agent.initialize();

      // TODO(burdon): Change API (remove halo/echo accessors).
      const space = await agent.client!.echo.createSpace();

      const skip = true;
      if (!skip) {
        const observable = await space.createInvitation({ swarmKey });
        log('invitation', { invitation: observable.invitation });
        expect(swarmKey).to.deep.eq(observable.invitation?.swarmKey);

        // observable.subscribe({
        //   onSuccess(invitation: Invitation) {
        //     throw new Error('Function not implemented.');
        //   },
        //   onError(err: Error) {
        //     throw new Error('Function not implemented.');
        //   }
        // });
      }

      // TODO(burdon): Define actions/state machines.
      //  (e.g., CreateSpace, CreateInvitation, AcceptInvitation, MutateSpace).
      await agent.start();
      await agent.stop();

      // TODO(burdon): Need to start/stop services.
      // TODO(burdon): Race condition: SPACE_NOT_FOUND.
      await agent.destroy();
    }
  });
});
