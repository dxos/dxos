//
// Copyright 2024 DXOS.org
//
import * as orama from '@orama/orama';
import { expect } from 'chai';

import { describe, test } from '@dxos/test';

describe('Orama', () => {
  const typename = '@example.org/schema/product';
  const objects = [
    {
      data: {
        id: '1',
        title: 'Shoes',
        price: 100,
        tags: ['shoes', 'clothing'],
      },
      system: {
        type: { itemId: typename },
      },
    },
    {
      typename,
      id: '2',
      title: 'Shoes',
      price: 100,
      tags: ['shoes', 'clothing'],
    },
    {
      data: {
        id: '3',
        title: 'Jeans',
        price: 150,
        tags: ['jeans', 'clothing'],
      },
      system: {
        type: { itemId: typename },
      },
    },
    {
      data: {
        id: '4',
        caliber: 9,
      },
      system: { type: { itemId: '@example.org/schema/something-else' } },
    },
    { id: '5' },
  ];

  const getOrama = async () => {
    const db = await orama.create({
      schema: {
        system: {
          type: { itemId: 'string' },
        },
      },
    });
    await Promise.all(objects.map((object) => orama.insert<any>(db, object)));
    return db;
  };

  test('basic', async () => {
    const db = await getOrama();

    const result = await orama.search(db, { term: typename, exact: true, threshold: 0 });
    expect(result.hits.length).to.equal(2);
  });

  test('serialization', async () => {
    const db = await getOrama();

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
          term: typename,
          exact: true,
          threshold: 0,
        });
        expect(result.hits.length).to.equal(2);
      }
    }
  });

  test('get everything', async () => {
    const db = await getOrama();
    const result = await orama.search(db, { term: '', exact: false, threshold: 1 });
    expect(result.hits.length).to.equal(objects.length);
  });
});
