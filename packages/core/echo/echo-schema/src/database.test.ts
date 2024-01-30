//
// Copyright 2022 DXOS.org
//

import expect from 'expect'; // TODO(burdon): Can't use chai with wait-for-expect?
import { inspect } from 'node:util';

import { describe, test } from '@dxos/test';

import { Expando, TypedObject } from './object';
import { createDatabase, TestBuilder } from './testing';

// TODO(burdon): Normalize tests to use common graph data (see query.test.ts).

describe('Database', () => {
  test('flush with test builder', async () => {
    const testBuilder = new TestBuilder();
    const peer = await testBuilder.createPeer();
    peer.db.add(new Expando({ str: 'test' }));
    await testBuilder.flushAll();
  });

  test('inspect', async () => {
    const { db } = await createDatabase();

    const task = new TypedObject({
      title: 'Main task',
      tags: ['red', 'green'],
      assignee: new TypedObject({ name: 'Bob' }),
    });
    db.add(task);
    await db.flush();

    inspect(task);
    // console.log(task);
  });

  test('query by id', async () => {
    const { db } = await createDatabase();

    const n = 10;
    for (const _ of Array.from({ length: n })) {
      const obj = new TypedObject();
      db.add(obj);
    }
    await db.flush();

    {
      const { objects } = db.query();
      expect(objects).toHaveLength(n);
    }

    db.remove(db.query().objects[0]);
    await db.flush();

    {
      const { objects } = db.query();
      expect(objects).toHaveLength(n - 1);
    }
  });

  test('meta', async () => {
    const { db } = await createDatabase();

    const obj = new TypedObject();
    expectObjects(obj.__meta.keys, []);
    obj.__meta.keys = [{ id: 'test-key', source: 'test' }];
    expectObjects(obj.__meta.keys, [{ id: 'test-key', source: 'test' }]);

    db.add(obj);
    await db.flush();

    expectObjects(obj.__meta.keys, [{ id: 'test-key', source: 'test' }]);
    // TODO(mykola): Implement in automerge.
    // expect(obj[data]).toEqual({
    //   '@id': obj.id,
    //   '@type': undefined,
    //   '@model': 'dxos.org/model/document',
    //   '@meta': {
    //     keys: [{ id: 'test-key', source: 'test' }],
    //   },
    // });
  });
});

const expectObjects = (echoObjects: any[], expectedObjects: any) => {
  expect(mapEchoToPlainJsObject(echoObjects)).toStrictEqual(expectedObjects);
};

const mapEchoToPlainJsObject = (array: any[]): any[] => {
  return array.map((o) => (Array.isArray(o) ? mapEchoToPlainJsObject(o) : { ...o }));
};
