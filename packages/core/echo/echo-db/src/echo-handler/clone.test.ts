//
// Copyright 2023 DXOS.org
//

import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Filter, Query } from '@dxos/echo';
import { Obj, Ref, Type } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';

import { EchoTestBuilder } from '../testing';

import { clone } from './clone';

describe('clone', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('clone to a different database', async () => {
    const { db: db1 } = await builder.createDatabase();
    const { db: db2 } = await builder.createDatabase();

    const task1 = Obj.make(TestSchema.Expando, {
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
    const { db } = await builder.createDatabase();

    const task1 = Obj.make(TestSchema.Expando, {
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
    const { db: db1 } = await builder.createDatabase();
    const { db: db2 } = await builder.createDatabase();

    const task1 = Obj.make(TestSchema.Expando, {
      title: 'Main task',
      tags: ['red', 'green'],
      assignee: Ref.make(
        Obj.make(TestSchema.Expando, {
          type: 'Person',
          name: 'John Doe',
        }),
      ),
    });
    db1.add(task1);
    await db1.flush();

    const task2 = clone(task1, { additional: [task1.assignee.target] });
    expect(task2 !== task1).to.be.true;
    expect(task2.id).to.equal(task1.id);
    expect(task2.title).to.equal(task1.title);
    expect([...task2.tags]).to.deep.equal([...task1.tags]);
    expect(task2.assignee !== task1.assignee).to.be.true;
    expect(task2.assignee.target !== task1.assignee.target).to.be.true;
    expect(task2.assignee.target?.id).to.equal(task1.assignee.target?.id);
    expect(task2.assignee.target?.name).to.equal(task1.assignee.target?.name);

    db2.add(task2);
    await db2.flush();
    expect(task2.id).to.equal(task1.id);
    expect(task2.assignee !== task1.assignee).to.be.true;
    expect(task2.assignee.target !== task1.assignee.target).to.be.true;
    expect(task2.assignee.target?.id).to.equal(task1.assignee.target?.id);
    expect(task2.assignee.target?.name).to.equal(task1.assignee.target?.name);
    expect(
      (await db2.query(Query.select(Filter.type(TestSchema.Expando, { type: 'Person' }))).run())[0] === task2.assignee.target,
    ).to.be.true;
  });

  test('clone with nested text objects', async () => {
    const { db: db1 } = await builder.createDatabase();
    const { db: db2 } = await builder.createDatabase();

    // Create the nested object first and add to database.
    const details1 = Obj.make(TestSchema.Expando, { content: 'Some details' });
    db1.add(details1);

    // Create parent object with Ref to the nested object.
    const task1 = Obj.make(TestSchema.Expando, {
      title: 'Main task',
      tags: ['red', 'green'],
      details: Ref.make(details1),
    });
    db1.add(task1);
    await db1.flush();

    // Clone with the referenced object included.
    const task2 = clone(task1, { additional: [details1] });
    const details2 = task2.details?.target;
    expect(task2 !== task1).to.be.true;
    expect(task2.id).to.equal(task1.id);
    expect(task2.title).to.equal(task1.title);
    expect([...task2.tags]).to.deep.equal([...task1.tags]);
    expect(details2 !== details1).to.be.true;
    expect(details2?.id).to.equal(details1.id);
    expect(details2?.content).to.equal(details1.content);

    db2.add(task2);
    db2.add(details2!);
    await db2.flush();
    expect(task2.id).to.equal(task1.id);
    const resolvedDetails = task2.details?.target;
    expect(resolvedDetails !== details1).to.be.true;
    expect(resolvedDetails?.id).to.equal(details1.id);
    expect(resolvedDetails?.content).to.equal(details1.content);
  });
});
