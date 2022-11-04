//
// Copyright 2020 DXOS.org
//

import expect from 'expect';
import assert from 'node:assert';

import { Party, Client } from '@dxos/client';

/**
 * Test builder.
 */
// TODO(burdon): Reconcile with @dxos/feed-store.
export class TestBuilder {
  _client?: Client;

  get client() {
    return this._client!;
  }

  async initialize() {
    const client = new Client();
    await client.initialize();
    expect(client.initialized).toBeTruthy();

    await client.halo.createProfile({ username: 'test-user' });
    // const { username } = client.halo.profile!;
    // expect(username).toEqual('test-user');

    this._client = client;
  }

  async createParty() {
    assert(this._client);

    const party = await this._client.echo.createParty();
    expect(party.isOpen).toBeTruthy();

    return party;
  }

  async destroyParty(party: Party) {
    assert(this._client);

    await party.destroy();
    // TODO(burdon): Party and Database doesn't match.
    //  party.destroy not called until ClientServicesProxy.
    // console.log(party.database.state);
    // expect(party.is_active).toBeFalsy();

    await this._client.destroy();
    expect(this._client.initialized).toBeFalsy();
  }
}

type Callback = (client: Client, Party: Party) => Promise<void>;

export const testCallback = async (callback: Callback) => {
  const builder = new TestBuilder();
  await builder.initialize();
  const party = await builder.createParty();
  try {
    await callback(builder.client, party);
  } finally {
    await builder.destroyParty(party);
  }
};
