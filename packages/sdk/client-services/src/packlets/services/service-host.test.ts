//
// Copyright 2022 DXOS.org
//

import { MemorySignalManager, MemorySignalManagerContext } from '@dxos/messaging';
import { MemoryTransportFactory, NetworkManager } from '@dxos/network-manager';
import { expect } from 'chai';

import { latch, Trigger } from '@dxos/async';
import { Config, ConfigProto } from '@dxos/config';
import { InvitationState } from '@dxos/protocols/proto/dxos/client';
import { InvitationDescriptor } from '@dxos/protocols/proto/dxos/halo/invitations';
import { afterTest } from '@dxos/testutils';

import { ClientServiceHost } from './service-host';

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

describe('ServiceHost', function () {
  // TODO(burdon): Factor out.
  const createPeer = (signalManagerContext: MemorySignalManagerContext) => {
    const networkManager = new NetworkManager({
      signalManager: new MemorySignalManager(signalManagerContext),
      transportFactory: MemoryTransportFactory
    });

    return new ClientServiceHost({
      config: new Config(defaultTestingConfig),
      networkManager
    });
  };

  it('process device invitation', async function () {
    const signalManagerContext = new MemorySignalManagerContext();
    const peer1 = createPeer(signalManagerContext);
    const peer2 = createPeer(signalManagerContext);

    await peer1.open();
    await peer2.open();
    afterTest(() => peer1.close());
    afterTest(() => peer2.close());

    const invitationTrigger = new Trigger<InvitationDescriptor>();
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
