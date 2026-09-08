//
// Copyright 2023 DXOS.org
//

import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Filter, Obj, Query, Ref } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';

import { EchoTestBuilder } from '../testing';

describe('Obj.clone against a database', () => {
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

    const task2 = Obj.clone(task1, { retainId: true });
    expect(task2 !== task1).to.be.true;
    expect(task2.id).to.equal(task1.id);
    expect(task2.title).to.equal(task1.title);
    expect([...task2.tags]).to.deep.equal([...task1.tags]);

    db2.add(task2);
    await db2.flush();
    expect(task2.id).to.equal(task1.id);
  });

  test('clone to the same database by minting a new id', async () => {
    const { db } = await builder.createDatabase();

    const task1 = Obj.make(TestSchema.Expando, {
      title: 'Main task',
      tags: ['red', 'green'],
    });
    db.add(task1);
    await db.flush();

    const task2 = Obj.clone(task1);
    db.add(task2);
    await db.flush();
    expect(task2 !== task1).to.be.true;
    expect(task2.id).to.not.equal(task1.id);
    expect(task2.title).to.equal(task1.title);
    expect([...task2.tags]).to.deep.equal([...task1.tags]);
  });

  test('deep clone carries referenced objects across databases', async () => {
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

    const task2 = Obj.clone(task1, { deep: 'all', retainId: true });
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
    const assignee = await task2.assignee.load();
    expect(assignee?.id).to.equal(task1.assignee.target?.id);
    expect(assignee?.name).to.equal(task1.assignee.target?.name);
    expect((await db2.query(Query.select(Filter.type(TestSchema.Expando, { type: 'Person' }))).run())[0]?.id).to.equal(
      task1.assignee.target?.id,
    );
  });

  test('a reference shared by two properties clones once', async () => {
    const { db: db1 } = await builder.createDatabase();
    const { db: db2 } = await builder.createDatabase();

    const details1 = Obj.make(TestSchema.Expando, { content: 'Some details' });
    db1.add(details1);

    const task1 = Obj.make(TestSchema.Expando, {
      title: 'Main task',
      details: Ref.make(details1),
      summary: Ref.make(details1),
    });
    db1.add(task1);
    await db1.flush();

    const task2 = Obj.clone(task1, { deep: 'all', retainId: true });
    const details2 = task2.details?.target;
    expect(details2 !== details1).to.be.true;
    expect(details2?.id).to.equal(details1.id);
    expect(details2?.content).to.equal(details1.content);
    // The DAG is reused rather than re-cloned, so both refs land on the same clone.
    expect(task2.summary?.target === details2).to.be.true;

    db2.add(task2);
    await db2.flush();
    const resolvedDetails = await task2.details.load();
    expect(resolvedDetails?.id).to.equal(details1.id);
    expect(resolvedDetails?.content).to.equal(details1.content);
  });
});
