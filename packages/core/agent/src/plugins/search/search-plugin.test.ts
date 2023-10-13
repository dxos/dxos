//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';
import MiniSearch, { type Options } from 'minisearch';
import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { Trigger, asyncTimeout, sleep } from '@dxos/async';
import { Client, Config } from '@dxos/client';
import { TestBuilder, performInvitation } from '@dxos/client/testing';
import { Expando } from '@dxos/echo-schema';
import { SearchRequest } from '@dxos/protocols/proto/dxos/agent/search';
import { type GossipMessage } from '@dxos/protocols/proto/dxos/mesh/teleport/gossip';
import { afterTest, describe, test } from '@dxos/test';

import { SEARCH_CHANNEL, Search } from './search-plugin';

const TEST_DIR = 'tmp/dxos/testing/agent/indexing';

describe('SearchPlugin', () => {
  const documents = [
    {
      id: 1,
      hello: 'world',
      foo: 'bar',
    },
    {
      id: 2,
      foo: 'bar',
      nested: {
        deep: { foo: 'asdf bar' },
      },
    },
  ];

  /**
   * Test MiniSearch.
   * @see https://lucaong.github.io/minisearch/classes/_minisearch_.minisearch.html
   */
  test('minisearch', async () => {
    const opts: Options = {
      fields: ['hello', 'foo', 'nested.deep.foo'],
      extractField: (document: any, fieldName: string) => {
        return fieldName.split('.').reduce((doc, key) => doc && doc[key], document);
      },
      idField: 'id',
    };
    const miniSearch = new MiniSearch(opts);

    miniSearch.addAll(documents);

    const check = (index: MiniSearch) => {
      const searchResult = index.search('bas', { fuzzy: true });
      expect(searchResult).to.have.lengthOf(2);
      expect(searchResult.find((r) => r.id === 1)?.match.bar).to.deep.equal(['foo']);
      expect(searchResult.find((r) => r.id === 2)?.match.bar).to.deep.equal(['foo', 'nested.deep.foo']);
    };

    check(miniSearch);

    const file = path.join(TEST_DIR, 'index.json');
    {
      // Write index to file.
      const json = miniSearch.toJSON();
      mkdirSync(TEST_DIR, { recursive: true });
      writeFileSync(file, JSON.stringify(json, null, 2), { encoding: 'utf8' });
      afterTest(() => unlinkSync(file));
    }

    {
      // Read index from file.
      const readIndex = MiniSearch.loadJSON(readFileSync(file, 'utf8'), opts);
      check(readIndex);
    }
  });

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
      config: new Config({ runtime: { agent: { plugins: { indexing: { enabled: true } } } } }),
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
    const index = new Search();
    await index.initialize({ client: client1, clientServices: services1, plugins: [] });
    await index.open();
    afterTest(() => index.close());

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

      const subs = client2.spaces.default.listen(SEARCH_CHANNEL, (message) => {
        expect(message.payload.results).to.have.lengthOf(2);
        results.wake(message);
      });
      afterTest(() => subs());
    }

    // Send search request.
    {
      const searchRequest: SearchRequest = {
        query: 'bar',
        type: SearchRequest.Type.FUZZY,
      };

      await sleep(500);
      await client2.spaces.default.postMessage(SEARCH_CHANNEL, {
        '@type': 'dxos.agent.search.SearchRequest',
        ...searchRequest,
      });
    }

    await asyncTimeout(results.wait(), 1000);
  }).tag('flaky');
});
