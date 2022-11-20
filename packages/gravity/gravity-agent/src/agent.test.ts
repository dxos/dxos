//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';

import { Invitation } from '@dxos/client';
import { ConfigProto } from '@dxos/config';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

import { Agent } from './agent';

describe('Agent', function () {
  // TODO(burdon): Run local signal server for tests.
  it('create and starts a basic agent', async function () {
    const config: ConfigProto = { version: 1 };
    const swarmKey = PublicKey.random();

<<<<<<< HEAD
    {
      const agent = new Agent(config);
      await agent.initialize();

      // TODO(burdon): Change API (remove halo/echo accessors).
      const space = await agent.client!.echo.createSpace();

      // TODO(burdon): Race condition: SPACE_NOT_FOUND.
      if (false) {
        const observable = await space.createInvitation({ swarmKey });
        observable.subscribe({
          onSuccess(invitation: Invitation) {
            throw new Error('Function not implemented.');
          },
          onError(err: Error) {
            throw new Error('Function not implemented.');
          }
        });

        log('invitation', { invitation: observable.invitation });
        expect(swarmKey).to.deep.eq(observable.invitation?.swarmKey);
      }

      // TODO(burdon): Define actions/state machines.
      //  (e.g., CreateSpace, CreateInvitation, AcceptInvitation, MutateSpace).
      await agent.start();
      await agent.stop();

      // TODO(burdon): Race condition after creating space: Error closed (random-access-storage).
      await agent.destroy();
    }
=======
    // TODO(burdon): Define actions/state machines.
    //  (e.g., CreateSpace, CreateInvitation, AcceptInvitation, MutateSpace).
    await agent.start();
    expect(agent.started).to.be.true;
    await agent.stop();
    await agent.destroy();
>>>>>>> 5bef75edae9cd4431bb4e154997ac29c815a469f
  });
});
