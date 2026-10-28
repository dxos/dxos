//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test, vi } from 'vitest';

import { Event } from '@dxos/async';
import { Context } from '@dxos/context';
import { Aggregate, Filter, Obj, Order, Query } from '@dxos/echo';
import { type QueryAST } from '@dxos/echo-protocol';
import { TestSchema } from '@dxos/echo/testing';
import { EntityId } from '@dxos/keys';

import { type DatabaseImpl } from '../proxy-db/index.ts';
import { makeRegistry } from '../registry/index.ts';
import { EchoTestBuilder } from '../testing/index.ts';
import { LocalQueryEngine } from './local-query-engine.ts';
import { type SourceEntry } from './query-context.ts';
import { type RemoteQuerySource } from './remote-query-source.ts';

/** A remote that answers every query with fixed entries, and records what it was asked. */
class FixedRemote implements RemoteQuerySource {
  readonly changed = new Event<void>();
  readonly kind = 'index';
  readonly updates: QueryAST.Query[] = [];
  readonly runs: QueryAST.Query[] = [];
  #query?: QueryAST.Query = undefined;
  #open = false;

  constructor(private readonly _entries: SourceEntry[]) {}

  isServing(): boolean {
    return this.#open && this.#query !== undefined;
  }

  answers(): number {
    return this.isServing() ? 1 : 0;
  }

  isFailed(): boolean {
    return false;
  }

  isTruncated(): boolean {
    return false;
  }

  isPending(): boolean {
    return false;
  }

  open(): void {
    this.#open = true;
  }

  close(): void {
    this.#open = false;
    this.#query = undefined;
  }

  getResults(): SourceEntry[] {
    return this.isServing() ? this._entries : [];
  }

  async run(_ctx: Context, query: QueryAST.Query): Promise<SourceEntry[]> {
    this.runs.push(query);
    return this._entries;
  }

  update(query: QueryAST.Query): void {
    this.updates.push(query);
    this.#query = query;
  }
}

const remoteEntry = (object: Obj.Unknown): SourceEntry => ({
  id: object.id,
  result: object,
  resolution: { source: 'index', time: 0 },
});

describe('LocalQueryEngine', () => {
  let builder: EchoTestBuilder;
  let db: DatabaseImpl;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
    ({ db } = await builder.createDatabase({ types: [TestSchema.Person] }));
  });

  afterEach(async () => {
    await builder.close();
  });

  const engineFor = (query: Query.Any, remote: FixedRemote): LocalQueryEngine => {
    const engine = new LocalQueryEngine({ registry: makeRegistry(), onStart: () => {}, onStop: () => {} });
    engine.addDatabase(db);
    engine.addRemoteSource(remote);
    engine.update(query.from(db).ast);
    engine.start();
    return engine;
  };

  test('a stopped engine stops listening to its views, and a restart serves the query again', ({ expect }) => {
    const engine = engineFor(Query.select(Filter.type(TestSchema.Person)), new FixedRemote([]));
    const changed = vi.fn();
    engine.changed.on(changed);

    engine.stop();
    const added = db.add(Obj.make(TestSchema.Person, { name: 'while stopped' }));
    expect(changed).not.toHaveBeenCalled();

    engine.start();
    expect(engine.getResults().map((entry) => entry.id)).toEqual([added.id]);
    db.add(Obj.make(TestSchema.Person, { name: 'after restart' }));
    expect(changed).toHaveBeenCalled();
    engine.stop();
  });

  test('an unordered selection merges in id order, whichever side holds each object', ({ expect }) => {
    const local = [
      db.add(Obj.make(TestSchema.Person, { name: 'a' })),
      db.add(Obj.make(TestSchema.Person, { name: 'c' })),
    ];
    const unloaded = Obj.make(TestSchema.Person, { name: 'b' });
    const engine = engineFor(Query.select(Filter.type(TestSchema.Person)), new FixedRemote([remoteEntry(unloaded)]));

    const ids = [...new Set(engine.getResults().map((entry) => entry.id))];
    expect(ids).toEqual([...local, unloaded].map((object) => object.id).sort());
    engine.stop();
  });

  test('an explicit order is left to the remote, which defines the window', ({ expect }) => {
    const [first, second] = [Obj.make(TestSchema.Person, { name: 'x' }), Obj.make(TestSchema.Person, { name: 'y' })];
    const engine = engineFor(
      Query.select(Filter.type(TestSchema.Person)).orderBy(Order.rank()),
      new FixedRemote([remoteEntry(second), remoteEntry(first)]),
    );

    expect(engine.getResults().map((entry) => entry.id)).toEqual([second.id, first.id]);
    engine.stop();
  });

  test('a by-id query whose every id is loaded opens no remote stream', ({ expect }) => {
    const person = db.add(Obj.make(TestSchema.Person, { name: 'held' }));
    const remote = new FixedRemote([]);
    const engine = engineFor(Query.select(Filter.id(person.id)), remote);

    expect(remote.updates).toEqual([]);
    expect(engine.getCompleteness()).toBe('complete');
    expect(engine.getResults().map((entry) => entry.id)).toEqual([person.id]);
    engine.stop();
  });

  test('a by-id query for an object not loaded here opens the remote stream', ({ expect }) => {
    const remote = new FixedRemote([]);
    const engine = engineFor(Query.select(Filter.id(EntityId.random())), remote);

    expect(remote.updates).toHaveLength(1);
    engine.stop();
  });

  test('a by-id run takes what the index answers and loads only what it lacks', async ({ expect }) => {
    const answered = Obj.make(TestSchema.Person, { name: 'indexed' });
    const missing = EntityId.random();
    const remote = new FixedRemote([remoteEntry(answered)]);
    const engine = engineFor(Query.select(Filter.id(answered.id, missing)), remote);
    const load = vi.spyOn(db, 'batchLoadObjectCores');

    const results = await engine.run(Context.default(), Query.select(Filter.id(answered.id, missing)).from(db).ast);

    expect(results.map((entry) => entry.id)).toEqual([answered.id]);
    expect(load).toHaveBeenCalledWith([missing]);
    engine.stop();
  });

  test('an aggregate run keeps the remote share of members the working set cannot surface yet', async ({ expect }) => {
    const people = [
      db.add(Obj.make(TestSchema.Person, { name: 'a' })),
      db.add(Obj.make(TestSchema.Person, { name: 'b' })),
    ];
    const query = Query.select(Filter.type(TestSchema.Person)).aggregate({ count: Aggregate.count() });
    const remote = new FixedRemote([
      {
        id: '{}',
        resolution: { source: 'index', time: 0 },
        group: { key: {}, count: 2, aggregates: { count: 2 } },
        manifest: people.map((person) => ({ id: person.id, contribution: JSON.stringify({ count: 1 }) })),
      },
    ]);
    const engine = engineFor(query, remote);
    // A loaded object whose strong-dependency closure is still resolving, as right after it is first queried.
    vi.spyOn(db, 'areStrongDepsSatisfied').mockReturnValue(false);

    const results = await engine.run(Context.default(), query.from(db).ast);

    expect(results.map((entry) => entry.group?.aggregates?.count)).toEqual([2]);
    engine.stop();
  });

  test('a by-id aggregate counts a member whose dependencies settled unavailable once', async ({ expect }) => {
    const people = [
      db.add(Obj.make(TestSchema.Person, { name: 'a' })),
      db.add(Obj.make(TestSchema.Person, { name: 'b' })),
    ];
    const query = Query.select(Filter.id(...people.map((person) => person.id))).aggregate({ count: Aggregate.count() });
    const remote = new FixedRemote([
      {
        id: '{}',
        resolution: { source: 'index', time: 0 },
        group: { key: {}, count: 2, aggregates: { count: 2 } },
        manifest: people.map((person) => ({ id: person.id, contribution: JSON.stringify({ count: 1 }) })),
      },
    ]);
    const engine = engineFor(query, remote);
    // Settled but unsatisfied: an id selection still returns the member, a discovery query does not.
    vi.spyOn(db, 'areStrongDepsSatisfied').mockReturnValue(false);
    vi.spyOn(db, 'areStrongDepsResolved').mockReturnValue(true);

    const results = await engine.run(Context.default(), query.from(db).ast);

    expect(results.map((entry) => entry.group?.aggregates?.count)).toEqual([2]);
    engine.stop();
  });
});
