//
// Copyright 2020 DXOS.org
//

// @dxos/test platform=nodejs

import { expect } from 'chai';

import { asyncTimeout, Trigger } from '@dxos/async';
import { Config } from '@dxos/config';
import { verifyPresentation } from '@dxos/credentials';
import { PublicKey } from '@dxos/keys';
import { type Credential } from '@dxos/protocols/proto/dxos/halo/credentials';
import { describe, test, afterTest } from '@dxos/test';

import { Client } from '../client';
import { TestBuilder } from '../testing';

describe('Halo', () => {
  test('presentation', async () => {
    const config = new Config({
      version: 1,
      runtime: {
        client: {
          storage: {
            persistent: true,
            dataRoot: `/tmp/dxos/client/${PublicKey.random().toHex()}`,
          },
        },
      },
    });

    const testBuilder = new TestBuilder(config);

    {
      const client = new Client({ config, services: testBuilder.createLocal() });
      afterTest(() => client.destroy());
      await client.initialize();

      await client.halo.createIdentity({ displayName: 'test-user' });
      expect(client.halo.identity).exist;

      const trigger = new Trigger();
      let credentials: Credential[] = [];
      client.halo.credentials.subscribe((scredentials) => {
        credentials = scredentials.filter(
          ({ subject }) => subject.assertion['@type'] === 'dxos.halo.credentials.AdmittedFeed',
        );
        if (credentials.length >= 2) {
          trigger.wake();
        }
      });

      await asyncTimeout(trigger.wait(), 500);

      const nonce = new Uint8Array([0, 0, 0, 0]);
      const presentation = await client.halo.presentCredentials({
        ids: credentials.map(({ id }) => id!),
        nonce: new Uint8Array([0, 0, 0, 0]),
      });
      expect(presentation.credentials?.length).to.equal(2);
      expect(await verifyPresentation(presentation)).to.deep.equal({ kind: 'pass' });
      expect(presentation.proofs![0].nonce).to.deep.equal(nonce);
    }
  });

  test('query credentials', async () => {
    const testBuilder = new TestBuilder();

    const client = new Client({ services: testBuilder.createLocal() });
    afterTest(() => client.destroy());
    await client.initialize();

    await client.halo.createIdentity({ displayName: 'test-user' });
    expect(client.halo.identity).exist;

    const trigger = new Trigger();
    let credentials: Credential[] = [];
    client.halo.credentials.subscribe((scredentials) => {
      credentials = scredentials.filter(
        ({ subject }) => subject.assertion['@type'] === 'dxos.halo.credentials.AdmittedFeed',
      );
      if (credentials.length >= 2) {
        trigger.wake();
      }
    });
    await asyncTimeout(trigger.wait(), 500);

    expect(credentials.every((cred) => cred.subject.assertion['@type'] === 'dxos.halo.credentials.AdmittedFeed')).to.be
      .true;
  });
});
