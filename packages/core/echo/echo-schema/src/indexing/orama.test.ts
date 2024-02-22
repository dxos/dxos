//
// Copyright 2024 DXOS.org
//
import * as orama from '@orama/orama';
import { expect } from 'chai';

import { log } from '@dxos/log';
import { describe, test } from '@dxos/test';

describe('Orama', () => {
  test('basic', async () => {
    const db: orama.Orama<
      {
        schema: string;
      },
      orama.IIndex<orama.components.index.Index>,
      orama.IDocumentsStore<orama.components.documentsStore.DocumentsStore>
    > = await orama.create({
      schema: {
        schema: 'string',
      },
    });

    {
      const objects = [
        {
          id: '1',
          schema: '@dxos.org/examples/product',
          title: 'Shoes',
          price: 100,
          tags: ['shoes', 'clothing'],
        },
        {
          id: '2',
          schema: '@dxos.org/examples/product',
          title: 'T-shirt',
          price: 50,
          tags: ['t-shirt', 'clothing'],
        },
        {
          id: '3',
          schema: '@dxos.org/examples/product',
          title: 'Jeans',
          price: 150,
          tags: ['jeans', 'clothing'],
        },
        {
          id: '4',
          schema: '@dxos.org/examples/something-else',
          caliber: 9,
        },
        { id: '5' },
      ];
      await Promise.all(objects.map((object) => orama.insert<any>(db, object)));
    }

    {
      const result = await orama.search(db, { term: '@dxos.org/examples/product', exact: true, threshold: 0 });
      expect(result.hits.length).to.equal(3);
    }

    {
      // Serialize and deserialize.
      const serialized = await orama.save(db);

      const deserializedDb = await orama.create({
        schema: {
          schema: 'string',
        },
      });
      await orama.load(deserializedDb, serialized);

      {
        const result = await orama.search(deserializedDb, {
          term: '@dxos.org/examples/product',
          exact: true,
          threshold: 0,
        });
        expect(result.hits.length).to.equal(3);
      }
    }
  });
});
