//
// Copyright 2023 DXOS.org
//

import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';

import { asyncTimeout, latch, Trigger } from '@dxos/async';
import { Config } from '@dxos/config';
import { verifyPresentation } from '@dxos/credentials';
import { PublicKey } from '@dxos/keys';
import { MemorySignalManagerContext } from '@dxos/messaging';
import { Identity } from '@dxos/protocols/proto/dxos/client/services';
import { Credential } from '@dxos/protocols/proto/dxos/halo/credentials';
import { afterTest, describe, test } from '@dxos/test';

import { createMockCredential, createServiceHost } from '../testing';

chai.use(chaiAsPromised);

describe('ClientServicesHost', () => {
  test('queryCredentials', async () => {
    const host = createServiceHost(new Config(), new MemorySignalManagerContext());
    await host.open();
    afterTest(() => host.close());

    await host.services.IdentityService!.createIdentity({});
    const { spaceKey } = await host.services.SpacesService!.createSpace();

    const stream = host.services.SpacesService!.queryCredentials({ spaceKey });
    const [done, tick] = latch({ count: 3 });
    stream.subscribe((credential) => {
      tick();
      // console.log(credential);
    });
    afterTest(() => stream.close());

    await done();
  });

  test('write and query credentials', async () => {
    const host = createServiceHost(new Config(), new MemorySignalManagerContext());
    await host.open();
    afterTest(() => host.close());

    await host.services.IdentityService!.createIdentity({});

    const testCredential = await createMockCredential({
      signer: host._serviceContext.keyring,
      issuer: host._serviceContext.identityManager.identity!.deviceKey,
    });

    // Test if Identity exposes haloSpace key.
    const haloSpace = new Trigger<PublicKey>();
    host.services.IdentityService!.queryIdentity()!.subscribe(({ identity }) => {
      if (identity?.spaceKey) {
        haloSpace.wake(identity.spaceKey);
      }
    });

    await host.services.SpacesService?.writeCredentials({
      spaceKey: await haloSpace.wait(),
      credentials: [testCredential],
    });

    const credentials = host.services.SpacesService!.queryCredentials({ spaceKey: await haloSpace.wait() });
    const queriedCredential = new Trigger<Credential>();
    credentials.subscribe((credential) => {
      if (credential.subject.id.equals(testCredential.subject.id)) {
        queriedCredential.wake(credential);
      }
    });
    afterTest(() => credentials.close());

    await queriedCredential.wait();
  });

  test('sign presentation', async () => {
    const host = createServiceHost(new Config(), new MemorySignalManagerContext());
    await host.open();
    afterTest(() => host.close());

    await host.services.IdentityService!.createIdentity({});

    const testCredential = await createMockCredential({
      signer: host._serviceContext.keyring,
      issuer: host._serviceContext.identityManager.identity!.deviceKey,
    });

    const nonce = new Uint8Array([0, 0, 0, 0]);

    const presentation = await host.services.IdentityService!.signPresentation({
      presentation: {
        credentials: [testCredential],
      },
      nonce,
    });

    expect(presentation.proofs?.[0].nonce).to.deep.equal(nonce);
    expect(await verifyPresentation(presentation)).to.deep.equal({
      kind: 'pass',
    });
  });

  test('storage reset', async () => {
    const config = new Config({
      runtime: { client: { storage: { persistent: true, path: '/tmp/dxos/client-services/storage' } } },
    });
    {
      const host = createServiceHost(config, new MemorySignalManagerContext());
      await host.open();

      await host.services.IdentityService?.createIdentity({});

      expect(host._serviceContext.storage.size).to.exist;

      await asyncTimeout(host.reset(), 1000);
      await host.close();
    }

    {
      const host = createServiceHost(config, new MemorySignalManagerContext());
      await host.open();
      const trigger = new Trigger<Identity>();

      const stream = host.services.IdentityService?.queryIdentity();
      await stream?.waitUntilReady();

      stream?.subscribe((identity) => {
        if (identity.identity) {
          trigger.wake(identity.identity);
        }
      });
      await expect(asyncTimeout(trigger.wait(), 200)).to.be.rejectedWith();
      stream?.close();
      await host.close();
    }
  }).onlyEnvironments('nodejs', 'chromium', 'firefox');
});
