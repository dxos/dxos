//
// Copyright 2020 DXOS.org
//

import expect from 'expect';
import assert from 'node:assert';

import { Space, Client } from '@dxos/client';

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

    await client.halo.createProfile({ displayName: 'test-user' });
    // const { displayName } = client.halo.profile!;
    // expect(displayName).toEqual('test-user');

    this._client = client;
  }

  async createSpace() {
    assert(this._client);

    const space = await this._client.echo.createSpace();
    expect(space.isOpen).toBeTruthy();

    return space;
  }

  async destroySpace(space: Space) {
    assert(this._client);

    await space.destroy();
    // TODO(burdon): Space and Database doesn't match.
    //  space.destroy not called until ClientServicesProxy.
    // console.log(space.database.state);
    // expect(space.is_active).toBeFalsy();

    await this._client.destroy();
    expect(this._client.initialized).toBeFalsy();
  }
}

type Callback = (client: Client, Space: Space) => Promise<void>;

export const testCallback = async (callback: Callback) => {
  const builder = new TestBuilder();
  await builder.initialize();
  const space = await builder.createSpace();
  try {
    await callback(builder.client, space);
  } finally {
    await builder.destroySpace(space);
  }
};
