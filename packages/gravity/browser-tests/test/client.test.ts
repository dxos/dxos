//
// Copyright 2021 DXOS.org
//

import expect from 'expect';
import { Mocha } from 'mocha';
import { Client } from '@dxos/client'
import { createKeyPair } from '@dxos/crypto';
import 'source-map-support/register'
import { ObjectModel } from '../../../echo/object-model/dist/src';

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

  Mocha.it('create party', async () => {
    const client = new Client()

    await client.initialize()

    await client.createProfile({
      ...createKeyPair(),
      username: 'DXOS test'
    })

    const party = await client.echo.createParty()
    
    const item = await party.database.createItem({ model: ObjectModel })
    await item.model.setProperty('foo', 'bar')

    expect(item.model.getProperty('foo')).toEqual('bar')

    await client.destroy()
  });
});
