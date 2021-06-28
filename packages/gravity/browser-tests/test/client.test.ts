//
// Copyright 2021 DXOS.org
//

import expect from 'expect';
import { Mocha } from 'mocha';
import { Client } from '@dxos/client'
import { createKeyPair } from '@dxos/crypto';
import 'source-map-support/register'

Mocha.describe('Client', () => {
  Mocha.it('open & close', async () => {
    const client = new Client()

    await client.initialize()

    await client.destroy()
  });

  Mocha.it('create profile', async () => {
    const client = new Client()

    await client.initialize()

    await client.createProfile({
      ...createKeyPair(),
      username: 'DXOS test'
    })

    const profile = client.getProfile();
    expect(profile.username).toEqual('DXOS test')

    await client.destroy()
  });
});
