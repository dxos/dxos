//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';

import { latch, Trigger } from '@dxos/async';
import { Config } from '@dxos/config';
import { verifyPresentation } from '@dxos/credentials';
import { PublicKey } from '@dxos/keys';
import { MemorySignalManagerContext } from '@dxos/messaging';
import { Credential } from '@dxos/protocols/proto/dxos/halo/credentials';
import { afterTest, describe, test } from '@dxos/test';

import { createMockCredential, createServiceHost } from '../testing';

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

  test('write and query credentials', async () => {
    const host = createServiceHost(new Config(), new MemorySignalManagerContext());
    await host.open();
    afterTest(() => host.close());

    await host.services.ProfileService!.createProfile({});

    const testCredential = await createMockCredential({
      signer: host._serviceContext.keyring,
      issuer: host._serviceContext.identityManager.identity!.deviceKey
    });

    // Test if Profile exposes haloSpace key.
    const haloSpace = new Trigger<PublicKey>();
    host.services.ProfileService!.subscribeProfile()!.subscribe(({ profile }) => {
      if (profile?.haloSpace) {
        haloSpace.wake(profile.haloSpace);
      }
    });

    await host.services.SpacesService?.writeCredentials({
      spaceKey: await haloSpace.wait(),
      credentials: [testCredential]
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

    await host.services.ProfileService!.createProfile({});

    const testCredential = await createMockCredential({
      signer: host._serviceContext.keyring,
      issuer: host._serviceContext.identityManager.identity!.deviceKey
    });

    const nonce = new Uint8Array([0, 0, 0, 0]);

    const presentation = await host.services.ProfileService!.signPresentation({
      presentation: {
        credentials: [testCredential]
      },
      nonce
    });

    expect(presentation.proofs?.[0].nonce).to.deep.equal(nonce);
    expect(await verifyPresentation(presentation)).to.deep.equal({
      kind: 'pass'
    });
  });
});
