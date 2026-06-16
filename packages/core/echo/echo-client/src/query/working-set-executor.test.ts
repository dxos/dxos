//
// Copyright 2025 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import { Filter, Obj, Order, Query, Ref, Relation } from '@dxos/echo';
import { QueryPlanner } from '@dxos/echo-host/query';
import { TestSchema } from '@dxos/echo/testing';

import { DatabaseImpl } from '../proxy-db';
import { EchoTestBuilder } from '../testing';
import { WorkingSetQueryExecutor, type WorkingSetDataProvider } from './working-set-executor';

// ── Tests ────────────────────────────────────────────────────────────────────

describe('WorkingSetQueryExecutor', () => {
  let builder: EchoTestBuilder;
  let db: DatabaseImpl;

  beforeEach(async () => {
    builder = new EchoTestBuilder();
    await builder.open();
    const peer = await builder.createPeer({ types: [TestSchema.Person, TestSchema.Task, TestSchema.HasManager] });
    db = await peer.createDatabase();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('wildcard select returns all loaded cores', async ({ expect }) => {
    const alice = Obj.make(TestSchema.Person, { name: 'Alice' });
    const bob = Obj.make(TestSchema.Person, { name: 'Bob' });
    db.add(alice);
    db.add(bob);
    await db.flush();

    const results = planAndExecute(db, Query.select(Filter.everything()));
    const ids = results.map((item) => item.objectId);
    expect(ids).toContain(alice.id);
    expect(ids).toContain(bob.id);
  });

  test('type filter returns only objects of matching type', async ({ expect }) => {
    const alice = Obj.make(TestSchema.Person, { name: 'Alice' });
    const task = Obj.make(TestSchema.Task, { title: 'Task 1' });
    db.add(alice);
    db.add(task);
    await db.flush();

    const results = planAndExecute(db, Query.select(Filter.type(TestSchema.Person)));
    const ids = results.map((item) => item.objectId);
    expect(ids).toContain(alice.id);
    expect(ids).not.toContain(task.id);
  });

  test('id filter returns the specific object', async ({ expect }) => {
    const alice = Obj.make(TestSchema.Person, { name: 'Alice' });
    const bob = Obj.make(TestSchema.Person, { name: 'Bob' });
    db.add(alice);
    db.add(bob);
    await db.flush();

    const results = planAndExecute(db, Query.select(Filter.id(alice.id)));
    expect(results.map((item) => item.objectId)).toEqual([alice.id]);
  });

  test('property filter matches correct objects', async ({ expect }) => {
    const alice = Obj.make(TestSchema.Person, { name: 'Alice' });
    const bob = Obj.make(TestSchema.Person, { name: 'Bob' });
    db.add(alice);
    db.add(bob);
    await db.flush();

    const results = planAndExecute(db, Query.select(Filter.type(TestSchema.Person, { name: 'Alice' })));
    const ids = results.map((item) => item.objectId);
    expect(ids).toContain(alice.id);
    expect(ids).not.toContain(bob.id);
  });

  test('set-difference (without) excludes matching objects', async ({ expect }) => {
    const alice = Obj.make(TestSchema.Person, { name: 'Alice' });
    const bob = Obj.make(TestSchema.Person, { name: 'Bob' });
    db.add(alice);
    db.add(bob);
    await db.flush();

    // Query.without produces a SetDifferenceStep: all persons minus alice.
    const all = Query.select(Filter.type(TestSchema.Person)).from(db);
    const justAlice = Query.select(Filter.id(alice.id)).from(db);
    const plan = makeNoIndexPlanner().createPlan(Query.without(all, justAlice).ast);
    const results = makeExecutor(db).tryExecute(plan);
    expect(results).not.toBeNull();
    const ids = results!.map((item) => item.objectId);
    expect(ids).not.toContain(alice.id);
    expect(ids).toContain(bob.id);
  });

  test('OR filter (union of types) includes objects of either type', async ({ expect }) => {
    const alice = Obj.make(TestSchema.Person, { name: 'Alice' });
    const task = Obj.make(TestSchema.Task, { title: 'Task 1' });
    db.add(alice);
    db.add(task);
    await db.flush();

    const results = planAndExecute(
      db,
      Query.select(Filter.or(Filter.type(TestSchema.Person), Filter.type(TestSchema.Task))),
    );
    const ids = results.map((item) => item.objectId);
    expect(ids).toContain(alice.id);
    expect(ids).toContain(task.id);
  });

  test('outgoing reference traversal follows refs', async ({ expect }) => {
    const alice = Obj.make(TestSchema.Person, { name: 'Alice' });
    const task = Obj.make(TestSchema.Task, { title: 'Task 1', assignee: Ref.make(alice) });
    db.add(alice);
    db.add(task);
    await db.flush();

    // Find the person that task.assignee points to.
    const results = planAndExecute(db, Query.select(Filter.type(TestSchema.Task)).reference('assignee'));
    const ids = results.map((item) => item.objectId);
    expect(ids).toContain(alice.id);
  });

  test('incoming reference traversal finds referencing objects', async ({ expect }) => {
    const alice = Obj.make(TestSchema.Person, { name: 'Alice' });
    const task = Obj.make(TestSchema.Task, { title: 'Task 1', assignee: Ref.make(alice) });
    db.add(alice);
    db.add(task);
    await db.flush();

    // Find all objects that reference alice.
    const results = planAndExecute(db, Query.select(Filter.id(alice.id)).referencedBy());
    const ids = results.map((item) => item.objectId);
    expect(ids).toContain(task.id);
  });

  test('children traversal finds child objects', async ({ expect }) => {
    const parent = db.add(Obj.make(TestSchema.Expando, { name: 'Parent' }));
    const child = db.add(Obj.make(TestSchema.Expando, { [Obj.Parent]: parent, name: 'Child' }));
    await db.flush();

    const results = planAndExecute(db, Query.select(Filter.id(parent.id)).children());
    const ids = results.map((item) => item.objectId);
    expect(ids).toContain(child.id);
  });

  test('union query (Query.all) combines results from multiple sub-queries', async ({ expect }) => {
    const alice = Obj.make(TestSchema.Person, { name: 'Alice' });
    const task = Obj.make(TestSchema.Task, { title: 'Task 1' });
    db.add(alice);
    db.add(task);
    await db.flush();

    // Query.all produces a UnionStep over the given sub-queries.
    const persons = Query.select(Filter.type(TestSchema.Person)).from(db);
    const tasks = Query.select(Filter.type(TestSchema.Task)).from(db);
    const plan = makeNoIndexPlanner().createPlan(Query.all(persons, tasks).ast);
    const results = makeExecutor(db).tryExecute(plan);
    expect(results).not.toBeNull();
    const ids = results!.map((item) => item.objectId);
    expect(ids).toContain(alice.id);
    expect(ids).toContain(task.id);
  });

  test('order by property sorts results', async ({ expect }) => {
    const charlie = Obj.make(TestSchema.Person, { name: 'Charlie' });
    const alice = Obj.make(TestSchema.Person, { name: 'Alice' });
    const bob = Obj.make(TestSchema.Person, { name: 'Bob' });
    db.add(charlie);
    db.add(alice);
    db.add(bob);
    await db.flush();

    const results = planAndExecute(
      db,
      Query.select(Filter.type(TestSchema.Person)).orderBy(Order.property('name', 'asc')),
    );
    const personResults = results.filter((item) => {
      const data = item.core?.getObjectStructure().data;
      const name = data?.['name'];
      return name === 'Alice' || name === 'Bob' || name === 'Charlie';
    });
    const names = personResults.map((item) => item.core!.getObjectStructure().data['name']);
    expect(names).toEqual(['Alice', 'Bob', 'Charlie']);
  });

  test('limit step caps the result count', async ({ expect }) => {
    for (let idx = 0; idx < 5; idx++) {
      db.add(Obj.make(TestSchema.Person, { name: `Person ${idx}` }));
    }
    await db.flush();

    const results = planAndExecute(db, Query.select(Filter.type(TestSchema.Person)).limit(3));
    expect(results).toHaveLength(3);
  });

  test('TextSelector causes executor to return null', async ({ expect }) => {
    const planner = makeNoIndexPlanner();
    const executor = makeExecutor(db);
    const query = Query.select(Filter.text('foo')).from(db);
    const plan = planner.createPlan(query.ast);
    const results = executor.tryExecute(plan);
    // TextSelector requires SQL index — executor must bail.
    expect(results).toBeNull();
  });

  test('TimestampSelector (updated) causes executor to return null', async ({ expect }) => {
    const planner = makeNoIndexPlanner();
    const executor = makeExecutor(db);
    const query = Query.select(Filter.updated({ after: new Date(0) })).from(db);
    const plan = planner.createPlan(query.ast);
    const results = executor.tryExecute(plan);
    // TimestampSelector requires SQL index — executor must bail.
    expect(results).toBeNull();
  });

  test('relation source-to-relation traversal', async ({ expect }) => {
    const alice = Obj.make(TestSchema.Person, { name: 'Alice' });
    const bob = Obj.make(TestSchema.Person, { name: 'Bob' });
    db.add(alice);
    db.add(bob);

    const manages = Relation.make(TestSchema.HasManager, {
      [Relation.Source]: alice,
      [Relation.Target]: bob,
    });
    db.add(manages);
    await db.flush();

    // Find all relations where alice is the source.
    const results = planAndExecute(db, Query.select(Filter.id(alice.id)).sourceOf());
    const ids = results.map((item) => item.objectId);
    expect(ids).toContain(manages.id);
  });

  test('filter-deleted step filters out deleted objects', async ({ expect }) => {
    const alice = Obj.make(TestSchema.Person, { name: 'Alice' });
    const bob = Obj.make(TestSchema.Person, { name: 'Bob' });
    db.add(alice);
    db.add(bob);
    await db.flush();
    db.remove(alice);
    await db.flush();

    const results = planAndExecute(db, Query.select(Filter.type(TestSchema.Person)));
    const ids = results.map((item) => item.objectId);
    // Deleted alice must be excluded; non-deleted bob must be present.
    expect(ids).not.toContain(alice.id);
    expect(ids).toContain(bob.id);
  });
});

// ── Helpers ─────────────────────────────────────────────────────────────────

const makeNoIndexPlanner = () => new QueryPlanner({ defaultTextSearchKind: 'full-text', noIndexes: true });

const makeProvider = (db: DatabaseImpl): WorkingSetDataProvider => ({
  get spaceId() {
    return db.spaceId;
  },
  allCores: () => db.coreDatabase.allObjectCores(),
  getCoreById: (id, load) => db.coreDatabase.getObjectCoreById(id, { load: load ?? false }),
  areStrongDepsSatisfied: (core) => db.coreDatabase.areStrongDepsSatisfied(core),
});

const makeExecutor = (db: DatabaseImpl) => new WorkingSetQueryExecutor(makeProvider(db));

/**
 * Plans and executes a query against the given database.
 * Throws if the executor cannot satisfy the plan (i.e. it returned null).
 */
const planAndExecute = (db: DatabaseImpl, query: Query.Query<any>) => {
  const planner = makeNoIndexPlanner();
  const executor = makeExecutor(db);
  // All queries must be scoped; bind to the given database so the planner sees a from() clause.
  const plan = planner.createPlan(query.from(db).ast);
  const result = executor.tryExecute(plan);
  if (result === null) {
    throw new Error('WorkingSetQueryExecutor returned null — plan requires SQL index');
  }
  return result;
};
