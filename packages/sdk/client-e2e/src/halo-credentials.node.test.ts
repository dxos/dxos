//
// Copyright 2020 DXOS.org
//

import { create } from '@bufbuild/protobuf';
import { describe, expect, onTestFinished, test } from 'vitest';

import { Trigger, asyncTimeout } from '@dxos/async';
import { Client } from '@dxos/client';
import { TestBuilder } from '@dxos/client/testing';
import { Config } from '@dxos/config';
import { verifyPresentation } from '@dxos/credentials';
import { getCredentialAssertion } from '@dxos/credentials';
import { PublicKey } from '@dxos/keys';
import { requirePublicKey } from '@dxos/protocols/buf';
import { type Credential } from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import { ProfileDocumentSchema } from '@dxos/protocols/buf/dxos/halo/credentials_pb';

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

      await client.halo.createIdentity(create(ProfileDocumentSchema, { displayName: 'test-user' }));
      expect(client.halo.identity).exist;

      const trigger = new Trigger();
      let credentials: Credential[] = [];
      client.halo.credentials.subscribe((creds) => {
        credentials = creds.filter(
          (credential) => getCredentialAssertion(credential).$typeName === 'dxos.halo.credentials.SpaceMember',
        );
        if (credentials.length >= 1) {
          trigger.wake();
        }
      });

      await asyncTimeout(trigger.wait(), 500);

      const nonce = new Uint8Array([0, 0, 0, 0]);
      const presentation = await client.halo.presentCredentials({
        ids: credentials.map(({ id }) => requirePublicKey(id)),
        nonce: new Uint8Array([0, 0, 0, 0]),
      });
      expect(presentation.credentials?.length).to.equal(1);
      expect(await verifyPresentation(presentation)).to.deep.equal({ kind: 'pass' });
      expect(presentation.proofs![0].nonce).to.deep.equal(nonce);
    }
  });

  test('query credentials', async () => {
    const testBuilder = new TestBuilder();

    const client = new Client({ services: testBuilder.createLocalClientServices() });
    onTestFinished(() => client.destroy());
    await client.initialize();

    await client.halo.createIdentity(create(ProfileDocumentSchema, { displayName: 'test-user' }));
    expect(client.halo.identity).exist;

    const trigger = new Trigger();
    let credentials: Credential[] = [];
    client.halo.credentials.subscribe((scredentials) => {
      credentials = scredentials.filter(
        (credential) => getCredentialAssertion(credential).$typeName === 'dxos.halo.credentials.AdmittedFeed',
      );
      if (credentials.length >= 2) {
        trigger.wake();
      }
    });
    await asyncTimeout(trigger.wait(), 500);

    expect(credentials.every((cred) => getCredentialAssertion(cred).$typeName === 'dxos.halo.credentials.AdmittedFeed'))
      .to.be.true;
  });
});
