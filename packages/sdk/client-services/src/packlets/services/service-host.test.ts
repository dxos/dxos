//
// Copyright 2023 DXOS.org
//

import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { rmSync } from 'node:fs';

import { asyncTimeout, latch, Trigger } from '@dxos/async';
import { Config } from '@dxos/config';
import { Context } from '@dxos/context';
import { verifyPresentation } from '@dxos/credentials';
import { type PublicKey } from '@dxos/keys';
import { MemorySignalManagerContext } from '@dxos/messaging';
import { type Identity } from '@dxos/protocols/proto/dxos/client/services';
import { type Credential } from '@dxos/protocols/proto/dxos/halo/credentials';
import { afterTest, describe, test } from '@dxos/test';
import { isNode } from '@dxos/util';

import { createMockCredential, createServiceHost } from '../testing';

chai.use(chaiAsPromised);

describe('ClientServicesHost', () => {
  const dataRoot = '/tmp/dxos/client-services/service-host/storage';

  afterEach(async () => {
    // Clean up.
    isNode() && rmSync(dataRoot, { recursive: true, force: true });
  });

  test('open and close', async () => {
    const host = createServiceHost(new Config(), new MemorySignalManagerContext());
    await host.open(new Context());
    await host.close();
  });

  test('queryCredentials', async () => {
    const host = createServiceHost(new Config(), new MemorySignalManagerContext());
    await host.open(new Context());
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
    await host.open(new Context());
    afterTest(() => host.close());

    await host.services.IdentityService!.createIdentity({});

    const testCredential = await createMockCredential({
      signer: host.context.keyring,
      issuer: host.context.identityManager.identity!.deviceKey,
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
    await host.open(new Context());
    afterTest(() => host.close());

    await host.services.IdentityService!.createIdentity({});

    const testCredential = await createMockCredential({
      signer: host.context.keyring,
      issuer: host.context.identityManager.identity!.deviceKey,
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
      runtime: { client: { storage: { persistent: true, dataRoot } } },
    });
    {
      const host = createServiceHost(config, new MemorySignalManagerContext());
      await host.open(new Context());

      await host.services.IdentityService?.createIdentity({});

      expect(host.context.storage.size).to.exist;

      await asyncTimeout(host.reset(), 1000);
      await host.close();
    }

    {
      const host = createServiceHost(config, new MemorySignalManagerContext());
      await host.open(new Context());
      const trigger = new Trigger<Identity>();

      const stream = host.services.IdentityService?.queryIdentity();
      await stream?.waitUntilReady();

      stream?.subscribe((identity) => {
        if (identity.identity) {
          trigger.wake(identity.identity);
        }
      });
      await expect(asyncTimeout(trigger.wait(), 200)).to.be.rejectedWith();
      await stream?.close();
      await host.close();
    }
  }).onlyEnvironments('nodejs', 'chromium', 'firefox');
});
