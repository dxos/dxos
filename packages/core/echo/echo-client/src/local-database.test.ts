//
// Copyright 2026 DXOS.org
//

import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Filter, Hypergraph, Obj, Query } from '@dxos/echo';
import { localDatabaseFactory } from '@dxos/echo-sqlite';
import { TestSchema } from '@dxos/echo/testing';
import { layerMemory } from '@dxos/sql-sqlite/platform';

import { HypergraphImpl } from './hypergraph.ts';

describe('Hypergraph.localDatabase', () => {
  let runtime: ManagedRuntime.ManagedRuntime<Layer.Success<typeof layerMemory>, never>;
  let graph: HypergraphImpl;

  beforeEach(async () => {
    runtime = ManagedRuntime.make(layerMemory.pipe(Layer.orDie));
    graph = new HypergraphImpl();
    graph.registry.add([TestSchema.Person]);
    graph._setLocalDatabaseFactory(await runtime.runPromise(localDatabaseFactory));
  });

  afterEach(async () => {
    await graph._closeLocalDatabases();
    await runtime.dispose();
  });

  test('fails without a factory', () => {
    expect(() => new HypergraphImpl().localDatabase('settings')).toThrow(Hypergraph.LocalDatabaseNotAvailableError);
  });

  test('returns one database per name', () => {
    const settings = graph.localDatabase('settings');
    expect(graph.localDatabase('settings')).toBe(settings);
    expect(graph.localDatabase('drafts')).not.toBe(settings);
    expect(graph.localDatabase('drafts').spaceId).not.toBe(settings.spaceId);
  });

  test('keeps names isolated and reopens a name with its objects', async () => {
    const settings = graph.localDatabase('settings');
    settings.add(Obj.make(TestSchema.Person, { name: 'Ada' }));
    graph.localDatabase('drafts').add(Obj.make(TestSchema.Person, { name: 'Grace' }));
    await settings.flush();

    await graph._closeLocalDatabases();
    const reopened = graph.localDatabase('settings');
    expect(reopened).not.toBe(settings);
    const people = await reopened.query(Filter.type(TestSchema.Person)).run();
    expect(people.map((person) => person.name)).toEqual(['Ada']);
  });

  test('is part of graph queries and reachable by space id', async () => {
    const settings = graph.localDatabase('settings');
    const person = settings.add(Obj.make(TestSchema.Person, { name: 'Ada' }));
    await settings.flush();
    const found = await graph.query(Query.select(Filter.type(TestSchema.Person)).from('all-accessible-spaces')).run();
    expect(found).toEqual([person]);
    expect(graph.getDatabase(settings.spaceId)).toBe(settings);
  });
});
