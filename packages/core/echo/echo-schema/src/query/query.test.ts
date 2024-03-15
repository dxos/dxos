//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';

import { Trigger, asyncTimeout, sleep } from '@dxos/async';
import { QueryOptions } from '@dxos/protocols/proto/dxos/echo/filter';
import { afterTest, beforeAll, beforeEach, describe, test } from '@dxos/test';

import { Filter } from './filter';
import { type EchoDatabase } from '../database';
import { Expando, TypedObject, TextObject } from '../object';
import { TestBuilder, createDatabase } from '../testing';
import { Contact, types } from '../tests/proto';

describe('Queries', () => {
  let db: EchoDatabase;
  beforeAll(async () => {
    ({ db } = await createDatabase());

    // TODO(burdon): Factor out common dataset. Change to Expando.
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
      const { objects, results } = db.query({ label: undefined });
      expect(objects).to.have.length(1);
      expect(results).to.have.length(1);
      expect(results[0].object).to.eq(objects[0]);
      expect(results[0].id).to.eq(objects[0].id);
      expect(results[0].spaceKey).to.eq(db.spaceKey);
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
      const { objects } = db.query((object: TypedObject) => object.label === 'red' || object.label === 'green');
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
      const { objects } = db.query(undefined, { deleted: QueryOptions.ShowDeletedOption.HIDE_DELETED });
      expect(objects).to.have.length(7);
    }

    {
      const { objects } = db.query(undefined, { deleted: QueryOptions.ShowDeletedOption.SHOW_DELETED });
      expect(objects).to.have.length(10);
    }

    {
      const { objects } = db.query(undefined, { deleted: QueryOptions.ShowDeletedOption.SHOW_DELETED_ONLY });
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

test.skip('query with model filters', async () => {
  const testBuilder = new TestBuilder();
  const peer = await testBuilder.createPeer();

  const obj = peer.db.add(
    new Expando({
      title: 'title',
      description: new TextObject('description'),
    }),
  );

  expect(peer.db.query().objects).to.have.length(1);
  expect(peer.db.query().objects[0]).to.eq(obj);

  expect(peer.db.query(undefined, { models: ['*'] }).objects).to.have.length(2);
});

describe('Queries with types', () => {
  test('query by typename receives updates', async () => {
    const testBuilder = new TestBuilder();
    testBuilder.graph.addTypes(types);
    const peer = await testBuilder.createPeer();
    const contact = peer.db.add(new Contact());
    const name = 'Rich Ivanov';

    const query = peer.db.query(Filter.typename('example.test.Contact'));
    expect(query.objects).to.have.length(1);
    expect(query.objects[0]).to.eq(contact);

    const nameUpdate = new Trigger();
    const anotherContactAdded = new Trigger();
    const unsub = query.subscribe(({ objects }) => {
      if (objects.some((obj) => obj.name === name)) {
        nameUpdate.wake();
      }
      if (objects.length === 2) {
        anotherContactAdded.wake();
      }
    });
    afterTest(() => unsub());

    contact.name = name;
    peer.db.add(new Contact());

    await asyncTimeout(nameUpdate.wait(), 1000);
    await asyncTimeout(anotherContactAdded.wait(), 1000);
  });

  test('`instanceof` operator works', async () => {
    const testBuilder = new TestBuilder();
    testBuilder.graph.addTypes(types);
    const peer = await testBuilder.createPeer();
    const name = 'Rich Ivanov';
    const contact = new Contact({ name });
    peer.db.add(contact);
    expect(contact instanceof Contact).to.be.true;

    // query
    {
      const contact = peer.db.query(Contact.filter()).objects[0];
      expect(contact.name).to.eq(name);
      expect(contact instanceof Contact).to.be.true;
    }
  });
});

test('map over refs in query result', async () => {
  const testBuilder = new TestBuilder();
  const peer = await testBuilder.createPeer();

  const folder = peer.db.add(new TypedObject({ name: 'folder', objects: [] }));
  const objects = [
    new TypedObject({ idx: 0, title: 'Task 0' }),
    new TypedObject({ idx: 1, title: 'Task 1' }),
    new TypedObject({ idx: 2, title: 'Task 2' }),
  ];
  for (const object of objects) {
    folder.objects.push(object);
  }

  const query = peer.db.query({ name: 'folder' });
  const result = query.objects.flatMap(({ objects }) => objects);

  for (const i in objects) {
    expect(result[i]).to.eq(objects[i]);
  }
});
