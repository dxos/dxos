//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';
import { Builder, Index } from 'lunr';
import MiniSearch, { Options } from 'minisearch';
import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { Trigger, asyncTimeout, sleep } from '@dxos/async';
import { Client } from '@dxos/client';
import { TestBuilder, performInvitation } from '@dxos/client/testing';
import { Expando } from '@dxos/echo-schema';
import { log } from '@dxos/log';
import { GossipMessage } from '@dxos/protocols/proto/dxos/mesh/teleport/gossip';
import { afterTest, describe, test } from '@dxos/test';

import { Indexing, SearchRequest } from './indexing-plugin';

const TEST_DIR = 'tmp/dxos/testing/agent/indexing';

describe('Indexing', () => {
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
   * Test lunr search.
   * @see https://lunrjs.com/guides/index_prebuilding.html
   */
  test('lunr search', async () => {
    const lunr = new Builder();
    lunr.ref('id');
    lunr.metadataWhitelist.push('position');
    lunr.field('hello');
    lunr.field('foo');
    lunr.field('nested.deep.foo', {
      extractor: (doc: any) => {
        return doc?.nested?.deep?.foo;
      },
    });
    documents.forEach((doc) => lunr.add(doc));
    const index = lunr.build();

    const check = (index: Index) => {
      const searchResult = index.search('bar');
      expect(searchResult).to.have.lengthOf(2);
      expect((searchResult.find((r) => r.ref === '1')?.matchData.metadata as any).bar.foo.position[0]).to.deep.equal([
        0, 3,
      ]);
      expect(
        (searchResult.find((r) => r.ref === '2')?.matchData.metadata as any).bar['nested.deep.foo'].position[0],
      ).to.deep.equal([5, 3]);
    };

    check(index);

    const file = path.join(TEST_DIR, 'index.json');
    {
      // Write index to file.
      const json = index.toJSON();
      mkdirSync(TEST_DIR, { recursive: true });
      writeFileSync(file, JSON.stringify(json, null, 2), { encoding: 'utf8' });
      afterTest(() => unlinkSync(file));
    }

    {
      // Read index from file.
      const readJson = JSON.parse(readFileSync(file, 'utf8'));
      const readIndex = Index.load(readJson);
      check(readIndex);
    }
  });

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

  test.only('search request/response', async () => {
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
    const client1 = new Client({ services: services1 });
    await client1.initialize();
    afterTest(() => client1.destroy());
    await client1.halo.createIdentity({ displayName: 'user-with-index-plugin' });

    {
      // Create one space before indexing is initialized.
      const space = await client1.spaces.create({ name: 'first space' });
      log.info('firstSpace', { key: space.key });
      await space.waitUntilReady();
      space.db.add(new Expando(documents[0]));
      await space.db.flush();
    }

    const index = new Indexing();
    await index.initialize(client1, services1);
    await index.open();

    {
      const space = await client1.spaces.create({ name: 'second space' });
      log.info('secondSpace', { key: space.key });
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
    await asyncTimeout(client2.spaces.isReady.wait(), 1000);

    await asyncTimeout(client2.spaces.default.waitUntilReady(), 1000);

    client2.spaces.default.listen('dxos.agent.indexing-plugin', (message) => {
      log.info('search results', { message });
      expect(message.payload.results).to.have.lengthOf(2);
      results.wake(message);
    });

    // Send search request.
    const searchRequest: SearchRequest = {
      query: 'bar',
      options: { fuzzy: true },
    };

    await sleep(3000);
    await client2.spaces.default.postMessage('dxos.agent.indexing-plugin', searchRequest);

    await asyncTimeout(results.wait(), 1000);
  });
});
