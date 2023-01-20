//
// Copyright 2023 DXOS.org
//

import { latch } from '@dxos/async';
import { Config } from '@dxos/config';
import { MemorySignalManagerContext } from '@dxos/messaging';
import { afterTest, describe, test } from '@dxos/test';

import { createServiceHost } from '../testing';

describe('ClientServicesHost', () => {
  test('queryCredentials', async () => {
    const host = createServiceHost(new Config(), new MemorySignalManagerContext());
    await host.open();
    afterTest(() => host.close());

    await host.services.ProfileService!.createProfile({});
    const { publicKey: spaceKey } = await host.services.SpaceService!.createSpace();

    const stream = host.services.SpacesService!.queryCredentials({ spaceKey });
    const [done, tick] = latch({ count: 3 });
    stream.subscribe((credential) => {
      tick();
      // console.log(credential);
    });
    afterTest(() => stream.close());

    await done();
  });
});
