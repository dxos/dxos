//
// Copyright 2024 DXOS.org
//
import * as orama from '@orama/orama';
import { expect } from 'chai';

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
          schema: '@example.org/schema/product',
          title: 'Shoes',
          price: 100,
          tags: ['shoes', 'clothing'],
        },
        {
          id: '2',
          schema: '@example.org/schema/product',
          title: 'T-shirt',
          price: 50,
          tags: ['t-shirt', 'clothing'],
        },
        {
          id: '3',
          schema: '@example.org/schema/product',
          title: 'Jeans',
          price: 150,
          tags: ['jeans', 'clothing'],
        },
        {
          id: '4',
          schema: '@example.org/schema/something-else',
          caliber: 9,
        },
        { id: '5' },
      ];
      await Promise.all(objects.map((object) => orama.insert<any>(db, object)));
    }

    {
      const result = await orama.search(db, { term: '@example.org/schema/product', exact: true, threshold: 0 });
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
          term: '@example.org/schema/product',
          exact: true,
          threshold: 0,
        });
        expect(result.hits.length).to.equal(3);
      }
    }
  });
});
