//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';
import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
import { Builder, Index } from 'lunr';
import path from 'node:path';

import { afterTest, describe, test } from '@dxos/test';

const TEST_DIR = 'tmp/dxos/testing/agent/indexing';

describe('Indexing', () => {
  test('lunr search', async () => {
    const lunr = new Builder();
    lunr.metadataWhitelist.push('position');
    lunr.field('hello');
    lunr.field('foo');
    lunr.field('nested.deep.foo', {
      extractor: (doc: any) => {
        return doc?.nested?.deep?.foo;
      },
    });
    lunr.add({
      id: 1,
      hello: 'world',
      foo: 'bar',
    });
    lunr.add({
      id: 2,
      nested: {
        deep: { foo: 'asdf bar' },
      },
    });
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
});
