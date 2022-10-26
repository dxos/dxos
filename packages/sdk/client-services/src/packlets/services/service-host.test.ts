//
// Copyright 2022 DXOS.org
//

import { until } from '@dxos/async';
import { Config, ConfigProto } from '@dxos/config';
import { ModelFactory } from '@dxos/model-factory';
import { ObjectModel } from '@dxos/object-model';
import { InvitationState } from '@dxos/protocols/proto/dxos/client';
import { InvitationDescriptor } from '@dxos/protocols/proto/dxos/echo/invitations';
import { afterTest } from '@dxos/testutils';

import { ClientServiceHost } from './service-host';

const defaultTestingConfig: ConfigProto = {
  version: 1,
  runtime: {
    services: {
      signal: {
        server: 'ws://localhost:4000/.well-known/dx/signal'
      }
    }
  }
};

describe('ServiceHost', function () {
  it('process device invitation', async function () {
    const peer1 = new ClientServiceHost({
      config: new Config(defaultTestingConfig),
      modelFactory: new ModelFactory().registerModel(ObjectModel)
    });
    await peer1.open();
    afterTest(() => peer1.close());

    const peer2 = new ClientServiceHost({
      config: new Config(defaultTestingConfig),
      modelFactory: new ModelFactory().registerModel(ObjectModel)
    });
    await peer2.open();
    afterTest(() => peer2.close());

    await peer1.services.ProfileService.createProfile({});
    const invitation = await until<InvitationDescriptor>((resolve) => {
      const stream = peer1.services.ProfileService.createInvitation();
      stream.subscribe((msg) => {
        if (msg.descriptor) {
          resolve(msg.descriptor);
        }
      });
    });

    await until((resolve) => {
      const stream = peer2.services.ProfileService.acceptInvitation(invitation);
      stream.subscribe((msg) => {
        if (msg.state === InvitationState.SUCCESS) {
          resolve();
        }
      });
    });
  });
});
