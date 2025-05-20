//
// Copyright 2024 DXOS.org
//

import * as Orama from '@orama/orama';
import { describe, expect, test } from 'vitest';

describe('Orama', () => {
  // TODO(dmaretskyi): Get those from the test data.
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
        type: { objectId: typename },
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
        type: { objectId: typename },
      },
    },
    {
      data: {
        id: '4',
        caliber: 9,
      },
      system: { type: { objectId: '@example.org/schema/something-else' } }, // TODO(burdon): Better test values.
    },
    { id: '5' },
    {
      data: {
        id: '6',
        title: 'Shoes',
        price: 100,
        tags: ['shoes', 'clothing'],
      },
      system: {
        type: { objectId: typename },
      },
    },
    {
      typename,
      id: '7',
      title: 'Shoes',
      price: 100,
      tags: ['shoes', 'clothing'],
    },
    {
      data: {
        id: '8',
        title: 'Jeans',
        price: 150,
        tags: ['jeans', 'clothing'],
      },
      system: {
        type: { objectId: typename },
      },
    },
    {
      data: {
        id: '9',
        caliber: 9,
      },
      system: { type: { objectId: '@example.org/schema/something-else' } },
    },
    { id: '10' },
    {
      data: {
        id: '11',
        title: 'Shoes',
        price: 100,
        tags: ['shoes', 'clothing'],
      },
      system: {
        type: { objectId: typename },
      },
    },
    {
      typename,
      id: '12',
      title: 'Shoes',
      price: 100,
      tags: ['shoes', 'clothing'],
    },
    {
      data: {
        id: '13',
        title: 'Jeans',
        price: 150,
        tags: ['jeans', 'clothing'],
      },
      system: {
        type: { objectId: typename },
      },
    },
    {
      data: {
        id: '14',
        caliber: 9,
      },
      system: { type: { objectId: '@example.org/schema/something-else' } },
    },
    { id: '15' },
  ];

  const getOrama = async () => {
    const db = await Orama.create({
      schema: {
        system: {
          type: { objectId: 'string' },
        },
      },
    });
    await Promise.all(objects.map((object) => Orama.insert<any>(db, object)));
    return db;
  };

  test('basic', async () => {
    const db = await getOrama();

    const result = await Orama.search(db, { term: typename, exact: true, threshold: 0 });
    expect(result.hits.length).to.equal(6);
  });

  test('serialization', async () => {
    const db = await getOrama();

    {
      // Serialize and deserialize.
      const serialized = await Orama.save(db);

      const deserializedDb = await Orama.create({
        schema: {
          schema: 'string',
        },
      });
      await Orama.load(deserializedDb, serialized);

      {
        const result = await Orama.search(deserializedDb, {
          term: typename,
          exact: true,
          threshold: 0,
        });
        expect(result.hits.length).to.equal(6);
      }
    }
  });

  test('get everything', async () => {
    const db = await getOrama();
    const result = await Orama.search(db, { term: '', exact: true, threshold: 1, limit: 1_000_000 });
    expect(result.hits.length).to.equal(objects.length);
  });

  test('reload orama', async () => {
    const orama = await Orama.create({
      schema: {
        title: 'string',
      },
    });
    await Orama.insert(orama, {
      title: 'Oranges',
    });
    await Orama.insert(orama, {
      title: 'Apples',
    });
    expect((await Orama.search(orama, { term: 'Oranges' })).count).to.equal(1);
    expect((await Orama.search(orama, { term: 'Apples' })).count).to.equal(1);

    const serialized = await Orama.save(orama);
    {
      const orama = await Orama.create({
        schema: {
          title: 'string',
        },
      });
      await Orama.load(orama, serialized);
      await Orama.insert(orama, {
        title: 'Bananas',
      });
      expect((await Orama.search(orama, { term: 'Oranges' })).count).to.equal(1);
      expect((await Orama.search(orama, { term: 'Apples' })).count).to.equal(1);
      expect((await Orama.search(orama, { term: 'Bananas' })).count).to.equal(1);
    }
  });
});
