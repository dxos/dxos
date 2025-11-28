//
// Copyright 2023 DXOS.org
//

import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Filter, Query } from '@dxos/echo';
import { Obj, Ref, Type } from '@dxos/echo';

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

    const task1 = Obj.make(Type.Expando, {
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

    const task1 = Obj.make(Type.Expando, {
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

    const task1 = Obj.make(Type.Expando, {
      title: 'Main task',
      tags: ['red', 'green'],
      assignee: Ref.make(
        Obj.make(Type.Expando, {
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
      (await db2.query(Query.select(Filter.type(Type.Expando, { type: 'Person' }))).run())[0] === task2.assignee.target,
    ).to.be.true;
  });

  test('clone with nested text objects', async () => {
    const { db: db1 } = await builder.createDatabase();
    const { db: db2 } = await builder.createDatabase();

    const task1 = Obj.make(Type.Expando, {
      title: 'Main task',
      tags: ['red', 'green'],
      details: Obj.make(Type.Expando, { content: 'Some details' }),
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
