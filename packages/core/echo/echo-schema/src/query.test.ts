//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';

import { sleep } from '@dxos/async';
import { QUERY_ALL_MODELS, ShowDeletedOption } from '@dxos/echo-db';
import { beforeAll, beforeEach, describe, test } from '@dxos/test';

import { type EchoDatabase } from './database';
import { TestBuilder, createDatabase } from './testing';
import { Expando, TypedObject } from './typed-object';
import { Text } from './text-object';

describe('Queries', () => {
  let db: EchoDatabase;
  beforeAll(async () => {
    ({ db } = await createDatabase());

    // TODO(burdon): Factor out common dataset.
    const objects = [
      new TypedObject({ idx: 0, title: 'Task 0', label: 'red' }),
      new TypedObject({ idx: 1, title: 'Task 1', label: 'red' }),
      new TypedObject({ idx: 2, title: 'Task 2', label: 'red' }),
      new TypedObject({ idx: 3, title: 'Task 3', label: 'green' }),
      new TypedObject({ idx: 4, title: 'Task 4', label: 'green' }),
      new TypedObject({ idx: 5, title: 'Task 5', label: 'blue' }),
      new TypedObject({ idx: 6, title: 'Task 6', label: 'blue' }),
      new TypedObject({ idx: 7, title: 'Task 7', label: 'blue' }),
      new TypedObject({ idx: 8, title: 'Task 8', label: 'blue' }),
      new TypedObject({ idx: 9, title: 'Task 9' }),
    ];

    for (const object of objects) {
      db.add(object);
    }

    await db.flush();
  });

  test('filter properties', async () => {
    {
      const { objects } = db.query();
      expect(objects).to.have.length(10);
    }

    {
      const { objects } = db.query({ label: undefined });
      expect(objects).to.have.length(1);
    }

    {
      const { objects } = db.query({ label: 'red' });
      expect(objects).to.have.length(3);
    }

    {
      const { objects } = db.query({ label: 'pink' });
      expect(objects).to.have.length(0);
    }
  });

  test('filter operators', async () => {
    {
      const { objects } = db.query(() => false);
      expect(objects).to.have.length(0);
    }

    {
      const { objects } = db.query(() => true);
      expect(objects).to.have.length(10);
    }

    {
      const { objects } = db.query((object) => object.label === 'red' || object.label === 'green');
      expect(objects).to.have.length(5);
    }
  });

  test('filter chaining', async () => {
    {
      // prettier-ignore
      const { objects } = db.query([
        () => true,
        { label: 'blue' },
        (object: any) => object.idx > 6
      ]);
      expect(objects).to.have.length(2);
    }
  });

  test('options', async () => {
    {
      const { objects } = db.query({ label: 'red' });
      expect(objects).to.have.length(3);

      for (const object of objects) {
        db.remove(object);
      }
      await db.flush();
    }

    {
      const { objects } = db.query();
      expect(objects).to.have.length(7);
    }

    {
      const { objects } = db.query(undefined, { deleted: ShowDeletedOption.HIDE_DELETED });
      expect(objects).to.have.length(7);
    }

    {
      const { objects } = db.query(undefined, { deleted: ShowDeletedOption.SHOW_DELETED });
      expect(objects).to.have.length(10);
    }

    {
      const { objects } = db.query(undefined, { deleted: ShowDeletedOption.SHOW_DELETED_ONLY });
      expect(objects).to.have.length(3);
    }
  });
});

// TODO(wittjosiah): 2/3 of these tests fail. They reproduce issues that we want to fix.
describe.skip('Query updates', () => {
  let db: EchoDatabase;
  let objects: TypedObject[];

  beforeEach(async () => {
    ({ db } = await createDatabase());

    objects = [
      new TypedObject({ idx: 0, title: 'Task 0', label: 'red' }),
      new TypedObject({ idx: 1, title: 'Task 1', label: 'red' }),
      new TypedObject({ idx: 2, title: 'Task 2', label: 'red' }),
    ];

    for (const object of objects) {
      db.add(object);
    }

    await db.flush();
  });

  test('fires only once when new objects are added', async () => {
    const query = db.query({ label: 'red' });
    expect(query.objects).to.have.length(3);
    let count = 0;
    query.subscribe(() => {
      count++;
      expect(query.objects).to.have.length(4);
    });
    db.add(new TypedObject({ idx: 3, title: 'Task 3', label: 'red' }));
    await sleep(10);
    expect(count).to.equal(1);
  });

  test('fires only once when objects are removed', async () => {
    const query = db.query({ label: 'red' });
    expect(query.objects).to.have.length(3);
    let count = 0;
    query.subscribe(() => {
      count++;
      expect(query.objects).to.have.length(2);
    });
    db.remove(objects[0]);
    await sleep(10);
    expect(count).to.equal(1);
  });

  test('does not fire on object updates', async () => {
    const query = db.query({ label: 'red' });
    expect(query.objects).to.have.length(3);
    query.subscribe(() => {
      throw new Error('Should not be called.');
    });
    objects[0].title = 'Task 0a';
    await sleep(10);
  });
});

test('query with model filters', async () => {
  const testBuilder = new TestBuilder();
  const peer = await testBuilder.createPeer();

  const obj = peer.db.add(new Expando({
    title: 'title',
    description: new Text('description'),
  }))

  expect(peer.db.query().objects).to.have.length(1);
  expect(peer.db.query().objects[0]).to.eq(obj)

  expect(peer.db.query(undefined, { models: QUERY_ALL_MODELS }).objects).to.have.length(2);
})