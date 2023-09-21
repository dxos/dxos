//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';
import { Builder, Index } from 'lunr';
import MiniSearch, { Options } from 'minisearch';
import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { afterTest, describe, test } from '@dxos/test';

const TEST_DIR = 'tmp/dxos/testing/agent/indexing';

describe('Indexing', () => {
  const documents = [
    {
      '@id': 1,
      hello: 'world',
      foo: 'bar',
    },
    {
      '@id': 2,
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
    lunr.ref('@id');
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
      idField: '@id',
    };
    const miniSearch = new MiniSearch(opts);

    miniSearch.addAll(documents);

    const check = (index: MiniSearch) => {
      const searchResult = index.search('bar');
      expect(searchResult).to.have.lengthOf(2);
      expect(searchResult.find((r) => r.id === 1)?.match.bar).to.deep.equal(['foo']);
      expect(searchResult.find((r) => r.id === 2)?.match.bar).to.deep.equal(['nested.deep.foo']);
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
});
