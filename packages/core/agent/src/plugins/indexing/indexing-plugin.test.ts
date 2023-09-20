//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';
import { Builder } from 'lunr';

import { describe, test } from '@dxos/test';

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

    {
      const searchResult = index.search('bar');
      expect(searchResult).to.have.lengthOf(2);
      expect((searchResult.find((r) => r.ref === '1')?.matchData.metadata as any).bar.foo.position[0]).to.deep.equal([
        0, 3,
      ]);
      expect((searchResult.find((r) => r.ref === '2')?.matchData.metadata as any).bar.foo.position[0]).to.deep.equal([
        0, 3,
      ]);
    }
  });
});
