//
// Copyright 2020 DXOS.org
//

import { describe, expect, onTestFinished, test } from 'vitest';

import { Trigger, asyncTimeout } from '@dxos/async';
import { Config } from '@dxos/config';
import { verifyPresentation } from '@dxos/credentials';
import { PublicKey } from '@dxos/keys';
import { decodePublicKey } from '@dxos/protocols/buf';
import { type Credential, type ProfileDocument } from '@dxos/protocols/buf/dxos/halo/credentials_pb';

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
      const client = new Client({ config, services: testBuilder.createLocalClientServices() });
      onTestFinished(() => client.destroy());
      await client.initialize();

      await client.halo.createIdentity({ displayName: 'test-user' } as ProfileDocument);
      expect(client.halo.identity).exist;

      const trigger = new Trigger();
      let credentials: Credential[] = [];
      client.halo.credentials.subscribe((creds) => {
        credentials = creds.filter(
          ({ subject }) =>
            (subject?.assertion as unknown as { '@type'?: string })['@type'] === 'dxos.halo.credentials.SpaceMember',
        );
        if (credentials.length >= 2) {
          trigger.wake();
        }
      });

      await asyncTimeout(trigger.wait(), 500);

      const nonce = new Uint8Array([0, 0, 0, 0]);
      const presentation = await client.halo.presentCredentials({
        ids: credentials.map(({ id }) => decodePublicKey(id!)),
        nonce: new Uint8Array([0, 0, 0, 0]),
      });
      expect(presentation.credentials?.length).to.equal(2);
      expect(await verifyPresentation(presentation as never)).to.deep.equal({ kind: 'pass' });
      expect(presentation.proofs![0].nonce).to.deep.equal(nonce);
    }
  });

  test('query credentials', async () => {
    const testBuilder = new TestBuilder();

    const client = new Client({ services: testBuilder.createLocalClientServices() });
    onTestFinished(() => client.destroy());
    await client.initialize();

    await client.halo.createIdentity({ displayName: 'test-user' } as ProfileDocument);
    expect(client.halo.identity).exist;

    const trigger = new Trigger();
    let credentials: Credential[] = [];
    client.halo.credentials.subscribe((scredentials) => {
      credentials = scredentials.filter(
        ({ subject }) =>
          (subject?.assertion as unknown as { '@type'?: string })['@type'] === 'dxos.halo.credentials.AdmittedFeed',
      );
      if (credentials.length >= 2) {
        trigger.wake();
      }
    });
    await asyncTimeout(trigger.wait(), 500);

    expect(
      credentials.every(
        (cred) =>
          (cred.subject?.assertion as unknown as { '@type'?: string })['@type'] ===
          'dxos.halo.credentials.AdmittedFeed',
      ),
    ).to.be.true;
  });
});
