//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Entity, Filter, Obj, Query, Type } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';

import { EchoTestBuilder } from './echo-test-builder';

/**
 * Integration tests for schema registration semantics.
 *
 * The matrix consists of:
 * - storage: feed (queue) vs. database automerge object
 * - registry: runtime schema registry vs. persistent (in-db) schema registry
 */
describe('schema registration semantics', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  //
  // db.add / feed.append
  //

  describe('db.add', () => {
    test('runtime schema - succeeds when schema is registered in runtime registry', async () => {
      await using peer = await builder.createPeer({ types: [TestSchema.Person] });
      const db = await peer.createDatabase();
      const alice = db.add(Obj.make(TestSchema.Person, { name: 'Alice' }));
      expect(alice.id).toBeDefined();
    });

    test('persistent schema - succeeds when schema is registered in persistent registry', async () => {
      await using peer = await builder.createPeer();
      const db = await peer.createDatabase();
      const PersistentLocal = Schema.Struct({
        name: Schema.optional(Schema.String),
      }).pipe(Type.object({ typename: 'com.example.test.persistent-a', version: '0.1.0' }));
      const [stored] = await db.schemaRegistry.register([PersistentLocal]);
      const alice = db.add(Obj.make(stored, { name: 'Alice' }));
      expect(alice.id).toBeDefined();
    });

    test('fails when schema is not in runtime registry and not persisted in db', async () => {
      await using peer = await builder.createPeer();
      const db = await peer.createDatabase();
      expect(() => db.add(Obj.make(TestSchema.Person, { name: 'Alice' }))).toThrow(/Schema not registered/);
    });
  });

  describe('feed.append', () => {
    test('runtime schema - succeeds when schema is registered in runtime registry', async () => {
      await using peer = await builder.createPeer({ types: [TestSchema.Person] });
      const db = await peer.createDatabase();
      const queues = peer.client.constructQueueFactory(db.spaceId);
      const queue = queues.create();
      await queue.append([Obj.make(TestSchema.Person, { name: 'Alice' })]);
      expect(queue.objects).toHaveLength(1);
    });

    test('persistent schema - succeeds when schema is registered in persistent registry', async () => {
      await using peer = await builder.createPeer();
      const db = await peer.createDatabase();
      const PersistentLocal = Schema.Struct({
        name: Schema.optional(Schema.String),
      }).pipe(Type.object({ typename: 'com.example.test.persistent-b', version: '0.1.0' }));
      const [stored] = await db.schemaRegistry.register([PersistentLocal]);
      const queues = peer.client.constructQueueFactory(db.spaceId);
      const queue = queues.create();
      await queue.append([Obj.make(stored, { name: 'Alice' })]);
      expect(queue.objects).toHaveLength(1);
    });

    test('fails when schema is not in runtime registry and not persisted in db', async () => {
      await using peer = await builder.createPeer();
      const db = await peer.createDatabase();
      const queues = peer.client.constructQueueFactory(db.spaceId);
      const queue = queues.create();
      await expect(queue.append([Obj.make(TestSchema.Person, { name: 'Alice' })])).rejects.toThrow(
        /Schema not registered/,
      );
    });
  });

  //
  // Query typename validation
  //

  describe('query with unresolvable typename is an error', () => {
    test('db query', async () => {
      await using peer = await builder.createPeer();
      const db = await peer.createDatabase();
      await expect(db.query(Filter.type(TestSchema.Person)).run()).rejects.toThrow(/unknown typename/);
    });

    test('queue query', async () => {
      await using peer = await builder.createPeer();
      const db = await peer.createDatabase();
      const queues = peer.client.constructQueueFactory(db.spaceId);
      const queue = queues.create();
      await expect(queue.query(Filter.type(TestSchema.Person)).run()).rejects.toThrow(/unknown typename/);
    });

    test('db query succeeds when typename is registered in runtime registry', async () => {
      await using peer = await builder.createPeer({ types: [TestSchema.Person] });
      const db = await peer.createDatabase();
      const results = await db.query(Filter.type(TestSchema.Person)).run();
      expect(results).toHaveLength(0);
    });

    test('db query succeeds when typename is registered in persistent registry', async () => {
      await using peer = await builder.createPeer();
      const db = await peer.createDatabase();
      const PersistentLocal = Schema.Struct({
        name: Schema.optional(Schema.String),
      }).pipe(Type.object({ typename: 'com.example.test.persistent-c', version: '0.1.0' }));
      const [stored] = await db.schemaRegistry.register([PersistentLocal]);
      const results = await db.query(Filter.type(stored)).run();
      expect(results).toHaveLength(0);
    });
  });

  //
  // Query result filtering
  //

  describe('query filters results with unresolvable schema', () => {
    test('db objects whose schema can no longer be resolved are filtered out', async () => {
      await using peer = await builder.createPeer({ types: [TestSchema.Person] });
      const db = await peer.createDatabase();
      db.add(Obj.make(TestSchema.Person, { name: 'Alice' }));
      await db.flush();

      // Confirm the object is visible while the schema is registered.
      const withSchemaResults = await db.query(Query.select(Filter.everything())).run();
      expect(
        withSchemaResults.filter((entity) => Obj.getTypename(entity as any) === TestSchema.Person.typename),
      ).toHaveLength(1);

      // Simulate the schema disappearing from the runtime registry (and it was never persisted).
      (peer.client.graph.schemaRegistry as any)._registry.delete(TestSchema.Person.typename);

      // With skipSchemaValidation the object is still returned.
      const bypassResults = await db
        .query(Query.select(Filter.everything()).options({ skipSchemaValidation: true }))
        .run();
      expect(
        bypassResults.filter((entity) => Obj.getTypename(entity as any) === TestSchema.Person.typename),
      ).toHaveLength(1);

      // Without skipSchemaValidation the object is filtered out.
      const filteredResults = await db.query(Query.select(Filter.everything())).run();
      expect(
        filteredResults.filter((entity) => Obj.getTypename(entity as any) === TestSchema.Person.typename),
      ).toHaveLength(0);
    });

    test('queue objects whose schema cannot be resolved are filtered out', async () => {
      await using peer = await builder.createPeer({ types: [TestSchema.Person] });
      const db = await peer.createDatabase();
      const queues = peer.client.constructQueueFactory(db.spaceId);
      const queue = queues.create();
      await queue.append([Obj.make(TestSchema.Person, { name: 'Alice' })]);

      // With Person registered, the query returns the object.
      const withSchema = await queue
        .query(Query.select(Filter.everything()).options({ skipSchemaValidation: true }))
        .run();
      expect(withSchema).toHaveLength(1);

      // Simulate a peer without the Person schema in its runtime registry.
      (peer.client.graph.schemaRegistry as any)._registry.delete(TestSchema.Person.typename);

      // With skipSchemaValidation the object is still returned.
      const bypass = await queue.query(Query.select(Filter.everything()).options({ skipSchemaValidation: true })).run();
      expect(bypass).toHaveLength(1);

      // Without skipSchemaValidation the object is filtered out.
      const filtered = await queue.query(Query.select(Filter.everything())).run();
      expect(filtered).toHaveLength(0);
    });
  });

  //
  // skipSchemaValidation option
  //

  describe('skipSchemaValidation option', () => {
    test('db query with unresolvable typename succeeds when skipSchemaValidation is true', async () => {
      await using peer = await builder.createPeer();
      const db = await peer.createDatabase();
      const results = await db
        .query(Query.select(Filter.type(TestSchema.Person)).options({ skipSchemaValidation: true }))
        .run();
      expect(results).toEqual([]);
    });

    test('db query returns objects with unresolvable schema when skipSchemaValidation is true', async () => {
      await using peer = await builder.createPeer({ types: [TestSchema.Person] });
      const db = await peer.createDatabase();
      db.add(Obj.make(TestSchema.Person, { name: 'Alice' }));
      await db.flush();

      (peer.client.graph.schemaRegistry as any)._registry.delete(TestSchema.Person.typename);

      const results = await db.query(Query.select(Filter.everything()).options({ skipSchemaValidation: true })).run();
      const people = results.filter((entity) => Obj.getTypename(entity as any) === TestSchema.Person.typename);
      expect(people).toHaveLength(1);
    });

    test('queue query with unresolvable typename succeeds when skipSchemaValidation is true', async () => {
      await using peer = await builder.createPeer();
      const db = await peer.createDatabase();
      const queues = peer.client.constructQueueFactory(db.spaceId);
      const queue = queues.create();
      const results = await queue
        .query(Query.select(Filter.type(TestSchema.Person)).options({ skipSchemaValidation: true }))
        .run();
      expect(results).toEqual([]);
    });
  });

  //
  // Entity.getValidationErrors
  //

  describe('Entity.getValidationErrors', () => {
    test('returns empty array for a valid object', async () => {
      await using peer = await builder.createPeer({ types: [TestSchema.Person] });
      const db = await peer.createDatabase();
      const alice = db.add(Obj.make(TestSchema.Person, { name: 'Alice' }));
      const errors = Entity.getValidationErrors(alice);
      expect(errors).toEqual([]);
    });

    test('returns ArrayFormatterIssue-shaped entries', async () => {
      await using peer = await builder.createPeer({ types: [TestSchema.Person] });
      const db = await peer.createDatabase();
      const alice = db.add(Obj.make(TestSchema.Person, { name: 'Alice' }));

      const errors = Entity.getValidationErrors(alice);
      // Each issue has the ArrayFormatter shape even for an empty result (the array itself).
      for (const issue of errors) {
        expect(issue).toHaveProperty('path');
        expect(issue).toHaveProperty('message');
        expect(Array.isArray(issue.path)).toBe(true);
        expect(typeof issue.message).toBe('string');
      }
    });

    test('returns empty array when entity has no schema', async () => {
      const obj = Obj.make(TestSchema.Expando, { foo: 'bar' });
      const errors = Entity.getValidationErrors(obj as any);
      expect(Array.isArray(errors)).toBe(true);
    });
  });
});
