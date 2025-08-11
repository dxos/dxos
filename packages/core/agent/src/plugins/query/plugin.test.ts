//
// Copyright 2023 DXOS.org
//

import { afterAll, beforeAll, describe, expect, onTestFinished, test } from 'vitest';

import { Trigger, asyncTimeout } from '@dxos/async';
import { Client, Config } from '@dxos/client';
import { QueryOptions } from '@dxos/client/echo';
import { type AnyLiveObject, Expando, type Live } from '@dxos/client/echo';
import { TestBuilder, performInvitation } from '@dxos/client/testing';
import { Filter, Query, type QueryResult } from '@dxos/echo-db';
import { TestSchemaType, createSpaceObjectGenerator } from '@dxos/echo-generator';
import { QUERY_CHANNEL } from '@dxos/protocols';
import { QueryReactivity, type QueryRequest } from '@dxos/protocols/proto/dxos/echo/query';
import { type GossipMessage } from '@dxos/protocols/proto/dxos/mesh/teleport/gossip';

import { QueryPlugin } from './plugin';

describe('QueryPlugin', () => {
  test.skip('search request/response', async () => {
    //
    // 1. Test topology:
    //
    // agent (with query plugin)
    //    |
    //    | (device invitation)
    //    |
    // client
    //
    // 2. Test scenario:
    //   a. client 1 creates few spaces and propagates it with data.
    //   b. client 1 invites client 2 as another device.
    //   c. client 2 sends search request to client 1.
    //   d. client 1 responds with search results.

    const builder = new TestBuilder();
    onTestFinished(() => builder.destroy());

    const services1 = builder.createLocalClientServices();
    const client1 = new Client({
      services: services1,
      config: new Config({
        runtime: {
          agent: { plugins: [{ id: 'dxos.org/agent/plugin/query' }] },
        },
      }),
    });
    await client1.initialize();
    onTestFinished(() => client1.destroy());
    await client1.halo.createIdentity({ displayName: 'user-with-index-plugin' });

    let _org: Live<any>;
    {
      const space = await client1.spaces.create({ name: 'first space' });
      await space.waitUntilReady();
      const generator = createSpaceObjectGenerator(space);
      await generator.addSchemas();

      _org = generator.createObject({ types: [TestSchemaType.organization] });
      await space.db.flush();
    }
    const plugin = new QueryPlugin();
    await plugin.initialize({ client: client1, clientServices: services1 });

    await plugin.open();
    onTestFinished(() => plugin.close());

    const services2 = builder.createLocalClientServices();
    const client2 = new Client({ services: services2 });
    await client2.initialize();
    onTestFinished(() => client2.destroy());

    await asyncTimeout(Promise.all(performInvitation({ host: client1.halo, guest: client2.halo })), 1000);

    // Subscribe for search results.
    const results = new Trigger<GossipMessage>();
    {
      await asyncTimeout(client2.spaces.waitUntilReady(), 1000);

      await asyncTimeout(client2.spaces.default.waitUntilReady(), 1000);

      const subs = client2.spaces.default.listen(QUERY_CHANNEL, (message) => {
        expect(message.payload.results).to.have.lengthOf(1);
        results.wake(message);
      });
      onTestFinished(() => subs());
    }

    // Send search request.
    {
      const request: QueryRequest = {
        query: JSON.stringify(
          Query.select(Filter.everything()).options({ spaceIds: client1.spaces.get().map((s) => s.id) }).ast,
        ),
        queryId: 'test-query-id',
        reactivity: QueryReactivity.ONE_SHOT,
      };

      await client2.spaces.default.postMessage(QUERY_CHANNEL, {
        '@type': 'dxos.agent.query.QueryRequest',
        ...request,
      });
    }

    await asyncTimeout(results.wait(), 1000);
  });

  describe.skip('Remote query', () => {
    let builder: TestBuilder;
    let agent: Client;
    let plugin: QueryPlugin;
    let client: Client;
    let testName: string;

    beforeAll(async () => {
      // Setup topology:
      //
      // agent (with query plugin)
      //    |
      //    | (device invitation)
      //    |
      // client

      builder = new TestBuilder();

      {
        // Init agent (client with a plugin).
        const services = builder.createLocalClientServices();
        agent = new Client({
          services,
          config: new Config({
            runtime: { agent: { plugins: [{ id: 'dxos.org/agent/plugin/query' }] } },
          }),
        });
        await agent.initialize();
        await agent.halo.createIdentity({ displayName: 'user-with-index-plugin' });

        plugin = new QueryPlugin();
        await plugin.initialize({ client: agent, clientServices: services });
        await plugin.open();
      }

      {
        // Propagate data to agent.
        const space = await agent.spaces.create({ name: 'first space' });
        await space.waitUntilReady();
        const generator = createSpaceObjectGenerator(space);
        await generator.addSchemas();

        await generator.createObject({ types: [TestSchemaType.organization] });
        const objects = await generator.createObjects({ [TestSchemaType.contact]: 10 });
        testName = objects[0].name;
        await space.db.flush();
      }

      {
        const services = builder.createLocalClientServices();
        client = new Client({ services });
        await client.initialize();
      }

      {
        // Join client to agent.
        await asyncTimeout(Promise.all(performInvitation({ host: agent.halo, guest: client.halo })), 1000);
      }

      {
        // Wait for client to be ready.
        await asyncTimeout(client.spaces.waitUntilReady(), 2000);
        await asyncTimeout(client.spaces.default.waitUntilReady(), 1000);
      }
    });

    afterAll(async () => {
      await plugin.close();
      await client.destroy();
      await agent.destroy();
      await builder.destroy();
    });

    const waitForQueryResults = async (query: QueryResult) => {
      const results = new Trigger<AnyLiveObject<any>[]>();
      query.subscribe((query) => {
        if (query.results.some((result) => result.resolution?.source === 'remote')) {
          results.wake(query.objects);
        }
      });
      return asyncTimeout(results.wait(), 1000);
    };

    test('Text query', async () => {
      const results = await waitForQueryResults(
        client.spaces.query(Filter.type(Expando, { name: testName }), {
          dataLocation: QueryOptions.DataLocation.REMOTE,
        }),
      );

      expect(results.length >= 0).to.be.true;
      expect(results[0].name).to.equal(testName);
    });

    test('Typename query', async () => {
      const query = client.spaces.query(Filter.typename(TestSchemaType.organization), {
        dataLocation: QueryOptions.DataLocation.REMOTE,
      });
      const results = await waitForQueryResults(query);
      expect(results.length).to.equal(1);
      // TODO(mykola): Pass schema as linked cache from remote query.
      // expect(results[0].typename).to.equal(TestSchemaType.organization);
    });

    test('Property query', async () => {
      const query = client.spaces.query(Filter.type(Expando, { name: testName }), {
        dataLocation: QueryOptions.DataLocation.REMOTE,
      });
      const results = await waitForQueryResults(query);

      expect(results.length >= 0).to.be.true;
      expect(results[0].name).to.equal(testName);
    });
  });
});
