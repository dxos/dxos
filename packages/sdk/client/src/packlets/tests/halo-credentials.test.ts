//
// Copyright 2020 DXOS.org
//

// @dxos/test platform=nodejs

import { expect } from 'chai';

import { Trigger } from '@dxos/async';
import { Config } from '@dxos/config';
import { verifyPresentation } from '@dxos/credentials';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { Credential } from '@dxos/protocols/proto/dxos/halo/credentials';
import { describe, test, afterTest } from '@dxos/test';

import { Client } from '../client';
import { TestBuilder } from '../testing';

describe('Halo', () => {
  test.only('presentation', async () => {
    const config = new Config({
      version: 1,
      runtime: {
        client: {
          storage: {
            persistent: true, // TODO(burdon): Note required if path set.
            path: `/tmp/dxos/client/${PublicKey.random().toHex()}`
          }
        }
      }
    });

    const testBuilder = new TestBuilder(config);

    {
      const client = new Client({ config, services: testBuilder.createClientServicesHost() });
      afterTest(() => client.destroy());
      await client.initialize();

      await client.halo.createProfile({ displayName: 'test-user' });
      expect(client.halo.profile).exist;

      const credentials = client.halo.queryCredentials({ type: 'dxos.halo.credentials.AuthorizedDevice' });
      const trigger = new Trigger<Credential>();
      credentials.subscribe({
        onUpdate: (credentials) => {
          if (credentials.length > 0) {
            trigger.wake(credentials[0]);
          }
        },
        onError: (err) => log.catch(err)
      });
      const nonce = new Uint8Array([0, 0, 0, 0]);
      const presentation = await client.halo.presentCredentials({
        id: (await trigger.wait()).id!,
        nonce
      });

      expect(await verifyPresentation(presentation)).to.deep.equal({ kind: 'pass' });
      expect(presentation.proofs![0].nonce).to.deep.equal(nonce);
    }
  });
});
