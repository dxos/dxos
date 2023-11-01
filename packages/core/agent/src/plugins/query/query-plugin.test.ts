//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';

import { Trigger, asyncTimeout, sleep } from '@dxos/async';
import { Client, Config } from '@dxos/client';
import { QueryOptions } from '@dxos/client/echo';
import { TestBuilder, performInvitation } from '@dxos/client/testing';
import { type EchoObject, Expando, Filter } from '@dxos/echo-schema';
import { log } from '@dxos/log';
import { QUERY_CHANNEL } from '@dxos/protocols';
import { type QueryRequest } from '@dxos/protocols/proto/dxos/agent/query';
import { type GossipMessage } from '@dxos/protocols/proto/dxos/mesh/teleport/gossip';
import { afterTest, describe, test } from '@dxos/test';

import { QueryPlugin } from './query-plugin';

describe('QueryPlugin', () => {
  const documents = [
    {
      idx: 1,
      hello: 'world',
      foo: 'bar',
    },
    {
      idx: 2,
      foo: 'bar',
      nested: {
        deep: { foo: 'asdf bar' },
      },
    },
  ];

  test('search request/response', async () => {
    //
    // 1. Test topology:
    //
    // client 1 (with indexing plugin)
    //    |
    //    | (device invitation)
    //    |
    // client 2
    //
    // 2. Test scenario:
    //   a. client 1 creates few spaces and propagates it with data.
    //   b. client 1 invites client 2 as another device.
    //   c. client 2 sends search request to client 1.
    //   d. client 1 responds with search results.

    const builder = new TestBuilder();
    afterTest(() => builder.destroy());

    const services1 = builder.createLocal();
    const client1 = new Client({
      services: services1,
      config: new Config({
        runtime: { agent: { plugins: [{ id: 'dxos.org/agent/plugin/query', enabled: true }] } },
      }),
    });
    await client1.initialize();
    afterTest(() => client1.destroy());
    await client1.halo.createIdentity({ displayName: 'user-with-index-plugin' });

    {
      // Create one space before indexing is initialized.
      const space = await client1.spaces.create({ name: 'first space' });
      await space.waitUntilReady();
      space.db.add(new Expando(documents[0]));
      await space.db.flush();
    }
    const plugin = new QueryPlugin();
    await plugin.initialize({ client: client1, clientServices: services1, plugins: [] });

    await plugin.open();
    afterTest(() => plugin.close());

    {
      const space = await client1.spaces.create({ name: 'second space' });
      await space.waitUntilReady();
      space.db.add(new Expando(documents[1]));
      await space.db.flush();
    }

    const services2 = builder.createLocal();
    const client2 = new Client({ services: services2 });
    await client2.initialize();
    afterTest(() => client2.destroy());

    await asyncTimeout(Promise.all(performInvitation({ host: client1.halo, guest: client2.halo })), 1000);

    // Subscribe for search results.
    const results = new Trigger<GossipMessage>();
    {
      await asyncTimeout(client2.spaces.isReady.wait(), 1000);

      await asyncTimeout(client2.spaces.default.waitUntilReady(), 1000);

      const subs = client2.spaces.default.listen(QUERY_CHANNEL, (message) => {
        expect(message.payload.results).to.have.lengthOf(2);
        results.wake(message);
      });
      afterTest(() => subs());
    }

    // Send search request.
    {
      const request: QueryRequest = {
        filter: Filter.from(
          { foo: 'bar' },
          { models: ['*'], spaces: client1.spaces.get().map((s) => s.key) },
        ).toProto(),
        queryId: 'test-query-id',
      };

      await sleep(500);
      await client2.spaces.default.postMessage(QUERY_CHANNEL, {
        '@type': 'dxos.agent.query.QueryRequest',
        ...request,
      });
    }

    await asyncTimeout(results.wait(), 1000);
  });

  test.only('remote query', async () => {
    const builder = new TestBuilder();
    afterTest(() => builder.destroy());

    const services1 = builder.createLocal();
    const client1 = new Client({
      services: services1,
      config: new Config({
        runtime: { agent: { plugins: [{ id: 'dxos.org/agent/plugin/query', enabled: true }] } },
      }),
    });
    await client1.initialize();
    afterTest(() => client1.destroy());
    await client1.halo.createIdentity({ displayName: 'user-with-index-plugin' });

    {
      // Create one space before indexing is initialized.
      const space = await client1.spaces.create({ name: 'first space' });
      await space.waitUntilReady();
      space.db.add(new Expando(documents[0]));
      space.db.add(new Expando(documents[1]));
      await space.db.flush();
    }
    const plugin = new QueryPlugin();
    await plugin.initialize({ client: client1, clientServices: services1, plugins: [] });

    await plugin.open();
    afterTest(() => plugin.close());

    const services2 = builder.createLocal();
    const client2 = new Client({ services: services2 });
    await client2.initialize();
    afterTest(() => client2.destroy());

    await asyncTimeout(Promise.all(performInvitation({ host: client1.halo, guest: client2.halo })), 1000);

    const results = new Trigger<EchoObject[]>();
    {
      await asyncTimeout(client2.spaces.isReady.wait(), 1000);

      await asyncTimeout(client2.spaces.default.waitUntilReady(), 1000);
      const query = client2.spaces.query({ foo: 'bar' }, { dataLocation: QueryOptions.DataLocation.REMOTE });
      query.subscribe((query) => {
        if (query.results.some((r) => r.resolution?.source === 'remote')) {
          results.wake(query.objects);
        }
      });

      await asyncTimeout(results.wait(), 5000);
      expect(await results.wait()).to.have.lengthOf(2);
    }
  });
});
