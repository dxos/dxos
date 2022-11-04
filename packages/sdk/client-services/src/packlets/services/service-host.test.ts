//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';

import { latch, Trigger } from '@dxos/async';
import { Config, ConfigProto } from '@dxos/config';
import { MemorySignalManagerContext } from '@dxos/messaging';
import { InvitationState } from '@dxos/protocols/proto/dxos/client';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';
import { afterTest } from '@dxos/testutils';

import { createServiceHost } from './testing';

const defaultTestingConfig: ConfigProto = {
  version: 1
  // runtime: {
  //   services: {
  //     signal: {
  //       server: 'ws://localhost:4000/.well-known/dx/signal'
  //     }
  //   }
  // }
};

describe('services/service-host', function () {
  it.skip('process device invitation', async function () {
    const config = new Config(defaultTestingConfig);
    const signalManagerContext = new MemorySignalManagerContext();

    const peer1 = createServiceHost(config, signalManagerContext);
    const peer2 = createServiceHost(config, signalManagerContext);
    await peer1.open();
    await peer2.open();
    afterTest(() => peer1.close());
    afterTest(() => peer2.close());

    const invitationTrigger = new Trigger<Invitation>();
    {
      await peer1.services.ProfileService.createProfile({});
      const stream = peer1.services.ProfileService.createInvitation();
      stream.subscribe((msg) => {
        switch (msg.state) {
          case InvitationState.WAITING_FOR_CONNECTION: {
            invitationTrigger.wake(msg.descriptor!);
            break;
          }
        }
      });
    }

    const [done, setAck] = latch({ count: 2 });
    {
      const invitation = await invitationTrigger.wait();
      const stream = peer2.services.ProfileService.acceptInvitation(invitation);
      stream.subscribe((msg) => {
        switch (msg.state) {
          case InvitationState.CONNECTED: {
            setAck();
            break;
          }

          case InvitationState.SUCCESS: {
            expect(msg.partyKey).not.to.be.undefined;
            setAck();
            break;
          }
        }
      });
    }

    await done();
  });
});
