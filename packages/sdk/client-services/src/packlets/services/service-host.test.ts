//
// Copyright 2022 DXOS.org
//

import { it as test } from 'mocha';

import { until } from '@dxos/async';
import { Config } from '@dxos/config';
import { InvitationState } from '@dxos/protocols/proto/dxos/client';
import { InvitationDescriptor } from '@dxos/protocols/proto/dxos/echo/invitation';
import { afterTest } from '@dxos/testutils';

import { ClientServiceHost } from './service-host';

describe('ServiceHost', () => {
  test('device invitations', async () => {
    const peer1 = new ClientServiceHost(new Config({}));
    await peer1.open();
    afterTest(() => peer1.close());

    const peer2 = new ClientServiceHost(new Config({}));
    await peer2.open();
    afterTest(() => peer2.close());

    await peer1.services.ProfileService.createProfile({});

    const invitation = await until<InvitationDescriptor>((resolve) => {
      const stream = peer1.services.ProfileService.createInvitation();
      stream.subscribe(msg => {
        console.log('peer1', msg);
        if (msg.descriptor) {
          resolve(msg.descriptor);
        }
      });
    });

    await until(resolve => {
      const stream = peer2.services.ProfileService.acceptInvitation(invitation);
      stream.subscribe(msg => {
        console.log('peer2', msg);
        if (msg.state === InvitationState.SUCCESS) {
          resolve();
        }
      });
    });
  });
});
