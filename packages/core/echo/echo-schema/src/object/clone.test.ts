//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';

import { describe, test } from '@dxos/test';

import { clone } from './clone';
import * as E from '../effect/reactive';
import { createDatabase } from '../testing';
import { TextCompatibilitySchema } from '../type-collection';

describe('clone', () => {
  test('clone to a different database', async () => {
    const { db: db1 } = await createDatabase();
    const { db: db2 } = await createDatabase();

    const task1 = E.object(E.Expando, {
      title: 'Main task',
      tags: ['red', 'green'],
    });
    db1.add(task1);
    await db1.flush();

    const task2 = clone(task1);
    expect(task2 !== task1).to.be.true;
    expect(task2.id).to.equal(task1.id);
    expect(task2.title).to.equal(task1.title);
    expect([...task2.tags]).to.deep.equal([...task1.tags]);

    db2.add(task2);
    await db2.flush();
    expect(task2.id).to.equal(task1.id);

    expect(() => db1.add(task1)).to.throw;
  });

  test('clone to the same database by changing the id', async () => {
    const { db } = await createDatabase();

    const task1 = E.object(E.Expando, {
      title: 'Main task',
      tags: ['red', 'green'],
    });
    db.add(task1);
    await db.flush();

    const task2 = clone(task1, { retainId: false });
    db.add(task2);
    await db.flush();
    expect(task2 !== task1).to.be.true;
    expect(task2.id).to.not.equal(task1.id);
    expect(task2.title).to.equal(task1.title);
    expect([...task2.tags]).to.deep.equal([...task1.tags]);
  });

  test('clone with nested objects', async () => {
    const { db: db1 } = await createDatabase();
    const { db: db2 } = await createDatabase();

    const task1 = E.object(E.Expando, {
      title: 'Main task',
      tags: ['red', 'green'],
      assignee: E.object(E.Expando, {
        type: 'Person',
        name: 'John Doe',
      }),
    });
    db1.add(task1);
    await db1.flush();

    const task2 = clone(task1, { additional: [task1.assignee] });
    expect(task2 !== task1).to.be.true;
    expect(task2.id).to.equal(task1.id);
    expect(task2.title).to.equal(task1.title);
    expect([...task2.tags]).to.deep.equal([...task1.tags]);
    expect(task2.assignee !== task1.assignee).to.be.true;
    expect(task2.assignee.id).to.equal(task1.assignee.id);
    expect(task2.assignee.name).to.equal(task1.assignee.name);

    db2.add(task2);
    await db2.flush();
    expect(task2.id).to.equal(task1.id);
    expect(task2.assignee !== task1.assignee).to.be.true;
    expect(task2.assignee.id).to.equal(task1.assignee.id);
    expect(task2.assignee.name).to.equal(task1.assignee.name);
    expect(db2.query({ type: 'Person' }).objects[0] === task2.assignee).to.be.true;
  });

  test('clone with nested text objects', async () => {
    const { db: db1 } = await createDatabase();
    const { db: db2 } = await createDatabase();

    const task1 = E.object(E.Expando, {
      title: 'Main task',
      tags: ['red', 'green'],
      details: E.object(TextCompatibilitySchema, { content: 'Some details' }),
    });
    db1.add(task1);
    await db1.flush();

    const task2 = clone(task1, { additional: [task1.details] });
    expect(task2 !== task1).to.be.true;
    expect(task2.id).to.equal(task1.id);
    expect(task2.title).to.equal(task1.title);
    expect([...task2.tags]).to.deep.equal([...task1.tags]);
    expect(task2.details !== task1.details).to.be.true;
    expect(task2.details.id).to.equal(task1.details.id);
    expect(task2.details.text).to.equal(task1.details.text);

    db2.add(task2);
    await db2.flush();
    expect(task2.id).to.equal(task1.id);
    expect(task2.details !== task1.details).to.be.true;
    expect(task2.details.id).to.equal(task1.details.id);
    expect(task2.details.text).to.equal(task1.details.text);
  });
});
