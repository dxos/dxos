//
// Copyright 2026 DXOS.org
//

import { afterEach, assert, beforeEach, describe, expect, test } from 'vitest';

import { waitForCondition } from '@dxos/async';
import { Context } from '@dxos/context';
import { Feed, Filter, Obj, Query, Relation, Scope } from '@dxos/echo';
import { TestReplicationNetwork } from '@dxos/echo-host/testing';
import { Ref } from '@dxos/echo/internal';
import { TestSchema } from '@dxos/echo/testing';
import { PublicKey } from '@dxos/keys';

import { type EchoDatabase } from '../proxy-db';
import { EchoTestBuilder } from './echo-test-builder';

// Matrix of e2e tests for STRONG-DEPENDENCY resolution exercised through the public database API
// (db.add / Relation.make / db.query / Relation.getSource|getTarget / feed / Obj.getParent),
// not the RefResolver internals. Each strong-dep kind (relation source/target, parent, type/schema)
// is checked against each resolve direction (same-db, automerge↔feed, cross-space, registry) under
// three conditions: in-memory, after reload (from disk), and across peers (from network).
//
// PRIMARY TARGET: a relation stored in the automerge database whose source/target live in a FEED.
// These cases are expected to fail until the feature lands; the rest are coverage.
describe('strong dependency resolution', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  const TYPES = [Feed.Feed, TestSchema.Person, TestSchema.Organization, TestSchema.HasManager, TestSchema.EmployedBy];

  //
  // Relation source/target — automerge → feed (PRIMARY).
  // Relation lives in the database; both endpoints live in a feed.
  //

  describe('relation source/target — automerge → feed (primary)', () => {
    test('in-memory', async () => {
      await using peer = await builder.createPeer({ types: TYPES });
      await using db = await peer.createDatabase();
      const feed = db.add(Feed.make({}));
      await db.flush();

      const alice = Obj.make(TestSchema.Person, { name: 'Alice' });
      const bob = Obj.make(TestSchema.Person, { name: 'Bob' });
      await db.appendToFeed(feed, [alice, bob]);

      const relation = db.add(
        Relation.make(TestSchema.HasManager, {
          [Relation.Source]: bob,
          [Relation.Target]: alice,
        }),
      );
      await db.flush();

      const [obj] = await db.query(Filter.id(relation.id)).run();
      assert(Relation.isRelation(obj), 'relation with feed endpoints must surface');
      expect((Relation.getSource(obj) as TestSchema.Person).name).toEqual('Bob');
      expect((Relation.getTarget(obj) as TestSchema.Person).name).toEqual('Alice');
    });

    // Expected to fail: after reload the strong-dep resolver does not yet re-open feed storage from
    // disk, so feed-resident endpoints are never loaded and the relation cannot surface. Unskip once
    // the feed handle lifecycle is wired into the reload path.
    test.fails('after reload (from disk)', async () => {
      const [spaceKey] = PublicKey.randomSequence();
      await using peer = await builder.createPeer({ types: TYPES });

      let relationId: string;
      let feedId: string;
      let rootUrl: string;
      {
        await using db = await peer.createDatabase(spaceKey);
        rootUrl = db.rootUrl!;
        const feed = db.add(Feed.make({}));
        feedId = feed.id;
        await db.flush();

        const alice = Obj.make(TestSchema.Person, { name: 'Alice' });
        const bob = Obj.make(TestSchema.Person, { name: 'Bob' });
        await db.appendToFeed(feed, [alice, bob]);

        const relation = db.add(
          Relation.make(TestSchema.HasManager, {
            [Relation.Source]: bob,
            [Relation.Target]: alice,
          }),
        );
        relationId = relation.id;
        await db.flush();
      }

      await peer.reload();
      {
        await using db = await peer.openDatabase(spaceKey, rootUrl);
        // Feed handles are created lazily after reload — no need to re-open manually.
        // Querying by type is sufficient to ensure the feed's storage is accessible.
        await db.query(Filter.id(feedId)).run();

        const [obj] = await db.query(Filter.id(relationId)).run();
        assert(Relation.isRelation(obj), 'reloaded relation with feed endpoints must surface');
        expect((Relation.getSource(obj) as TestSchema.Person).name).toEqual('Bob');
        expect((Relation.getTarget(obj) as TestSchema.Person).name).toEqual('Alice');
      }
    });

    // Expected to fail: the test builder only replicates Automerge documents (via addReplicator);
    // feed data has no cross-peer transport. EchoHost is constructed without syncQueue/getSyncState,
    // so peer 2's FeedStore never receives the feed endpoints and the relation's strong-dep closure
    // can never be satisfied from the network. Unskip once feed replication is wired into the builder.
    test.fails('multi-peer (from network)', async () => {
      const [spaceKey] = PublicKey.randomSequence();
      await using network = await new TestReplicationNetwork().open();
      await using peer1 = await builder.createPeer({ types: TYPES });
      await using peer2 = await builder.createPeer({ types: TYPES });
      await peer1.host.addReplicator(Context.default(), await network.createReplicator());
      await peer2.host.addReplicator(Context.default(), await network.createReplicator());

      await using db1 = await peer1.createDatabase(spaceKey);
      const feed1 = db1.add(Feed.make({}));
      await db1.flush();
      const alice = Obj.make(TestSchema.Person, { name: 'Alice' });
      const bob = Obj.make(TestSchema.Person, { name: 'Bob' });
      await db1.appendToFeed(feed1, [alice, bob]);
      const relation = db1.add(
        Relation.make(TestSchema.HasManager, {
          [Relation.Source]: bob,
          [Relation.Target]: alice,
        }),
      );
      await db1.flush();
      const heads = await db1.coreDatabase.getDocumentHeads();

      await using db2 = await peer2.openDatabase(spaceKey, db1.rootUrl!);
      await db2.coreDatabase.waitUntilHeadsReplicated(heads);
      await db2.coreDatabase.updateIndexes();
      // Peer 2 must fetch the feed endpoints over the network to satisfy the relation's strong deps.
      // Feed is identified by the feed object id replicated through the automerge document.

      const obj = await waitForRelation(db2, relation.id);
      assert(Relation.isRelation(obj), 'relation with feed endpoints must surface on a remote peer');
      expect((Relation.getSource(obj) as TestSchema.Person).name).toEqual('Bob');
      expect((Relation.getTarget(obj) as TestSchema.Person).name).toEqual('Alice');
    });
  });

  //
  // Relation source/target — source in database, target in feed (mixed).
  // The relation and its source live in the automerge database; only the target lives in a feed.
  // The target is referenced as the decoded feed object (carrying its absolute feed URI) so it is
  // resolved from the feed rather than copied into the database.
  //

  describe('relation source/target — source in database, target in feed', () => {
    test('in-memory', async () => {
      await using peer = await builder.createPeer({ types: TYPES });
      await using db = await peer.createDatabase();
      const feed = db.add(Feed.make({}));
      await db.flush();

      const source = db.add(Obj.make(TestSchema.Person, { name: 'Bob' }));
      const targetSeed = Obj.make(TestSchema.Person, { name: 'Alice' });
      // After appendToFeed, targetSeed is stamped in-place with its absolute URI.
      await db.appendToFeed(feed, [targetSeed]);
      assert(targetSeed != null, 'feed target must be retrievable from the feed');

      const relation = db.add(
        Relation.make(TestSchema.HasManager, {
          [Relation.Source]: source,
          [Relation.Target]: targetSeed,
        }),
      );
      await db.flush();

      const [obj] = await db.query(Filter.id(relation.id)).run();
      assert(Relation.isRelation(obj), 'relation with a db source and feed target must surface');
      expect((Relation.getSource(obj) as TestSchema.Person).name).toEqual('Bob');
      expect((Relation.getTarget(obj) as TestSchema.Person).name).toEqual('Alice');

      // The target stays in the feed — it is not copied into the database.
      const persisted = await db.query(Filter.type(TestSchema.Person)).run();
      expect(persisted.map((person) => person.id)).toEqual([source.id]);
    });

    // Expected to fail: after reload the strong-dep resolver does not yet re-open feed storage from
    // disk, so feed-resident endpoints are never loaded and the relation cannot surface. Unskip once
    // the feed handle lifecycle is wired into the reload path.
    test.fails('after reload (from disk)', async () => {
      const [spaceKey] = PublicKey.randomSequence();
      await using peer = await builder.createPeer({ types: TYPES });

      let relationId: string;
      let feedId: string;
      let rootUrl: string;
      {
        await using db = await peer.createDatabase(spaceKey);
        rootUrl = db.rootUrl!;
        const feed = db.add(Feed.make({}));
        feedId = feed.id;
        await db.flush();

        const source = db.add(Obj.make(TestSchema.Person, { name: 'Bob' }));
        const targetSeed = Obj.make(TestSchema.Person, { name: 'Alice' });
        // After appendToFeed, targetSeed is stamped in-place with its absolute URI.
        await db.appendToFeed(feed, [targetSeed]);
        assert(targetSeed != null, 'feed target must be retrievable from the feed');

        const relation = db.add(
          Relation.make(TestSchema.HasManager, {
            [Relation.Source]: source,
            [Relation.Target]: targetSeed,
          }),
        );
        relationId = relation.id;
        await db.flush();
      }

      await peer.reload();
      {
        await using db = await peer.openDatabase(spaceKey, rootUrl);
        // Feed handles are created lazily after reload — no need to re-open manually.
        await db.query(Filter.id(feedId)).run();

        const [obj] = await db.query(Filter.id(relationId)).run();
        assert(Relation.isRelation(obj), 'reloaded relation with a db source and feed target must surface');
        expect((Relation.getSource(obj) as TestSchema.Person).name).toEqual('Bob');
        expect((Relation.getTarget(obj) as TestSchema.Person).name).toEqual('Alice');
      }
    });

    // Expected to fail: the test builder only replicates Automerge documents (via addReplicator);
    // feed data has no cross-peer transport. EchoHost is constructed without syncQueue/getSyncState,
    // so peer 2's FeedStore never receives the feed target and the relation's strong-dep closure can
    // never be satisfied from the network. Unskip once feed replication is wired into the builder.
    test.fails('multi-peer (from network)', async () => {
      const [spaceKey] = PublicKey.randomSequence();
      await using network = await new TestReplicationNetwork().open();
      await using peer1 = await builder.createPeer({ types: TYPES });
      await using peer2 = await builder.createPeer({ types: TYPES });
      await peer1.host.addReplicator(Context.default(), await network.createReplicator());
      await peer2.host.addReplicator(Context.default(), await network.createReplicator());

      await using db1 = await peer1.createDatabase(spaceKey);
      const feed1 = db1.add(Feed.make({}));
      await db1.flush();
      const source = db1.add(Obj.make(TestSchema.Person, { name: 'Bob' }));
      const targetSeed = Obj.make(TestSchema.Person, { name: 'Alice' });
      // After appendToFeed, targetSeed is stamped in-place with its absolute URI.
      await db1.appendToFeed(feed1, [targetSeed]);
      assert(targetSeed != null, 'feed target must be retrievable from the feed');
      const relation = db1.add(
        Relation.make(TestSchema.HasManager, {
          [Relation.Source]: source,
          [Relation.Target]: targetSeed,
        }),
      );
      await db1.flush();
      const heads = await db1.coreDatabase.getDocumentHeads();

      await using db2 = await peer2.openDatabase(spaceKey, db1.rootUrl!);
      await db2.coreDatabase.waitUntilHeadsReplicated(heads);
      await db2.coreDatabase.updateIndexes();
      // The db source replicates with the document; the feed target must be fetched over the network.
      // Feed is identified by the feed object id replicated through the automerge document.

      const obj = await waitForRelation(db2, relation.id);
      assert(Relation.isRelation(obj), 'relation with a db source and feed target must surface on a remote peer');
      expect((Relation.getSource(obj) as TestSchema.Person).name).toEqual('Bob');
      expect((Relation.getTarget(obj) as TestSchema.Person).name).toEqual('Alice');
    });
  });

  //
  // Relation source/target — feed → automerge.
  // Relation lives in a feed; an endpoint lives in the database.
  //

  describe('relation source/target — feed → automerge', () => {
    // Expected to fail: a relation in a feed whose source lives in the automerge database hangs
    // during query because the strong-dep resolver cannot yet bridge feed→database direction in-memory.
    // Unskip once feed→db strong-dep resolution is implemented.
    test.fails('in-memory', async () => {
      await using peer = await builder.createPeer({ types: TYPES });
      await using db = await peer.createDatabase();
      const feed = db.add(Feed.make({}));
      await db.flush();

      const contact = db.add(Obj.make(TestSchema.Person, { name: 'Alice' }));
      const org = Obj.make(TestSchema.Organization, { name: 'DXOS' });
      const relation = Relation.make(TestSchema.EmployedBy, {
        [Relation.Source]: contact,
        [Relation.Target]: org,
        role: 'CTO',
      });
      await db.flush();
      await db.appendToFeed(feed, [org, relation]);

      const [, surfaced] = await db.query(Query.select(Filter.everything()).from(Scope.feed(Feed.getQueueUri(feed)!))).run();
      assert(Relation.isRelation(surfaced), 'feed relation must surface');
      expect(Relation.getSource(surfaced as TestSchema.EmployedBy).name).toEqual('Alice');
      expect(Relation.getTarget(surfaced as TestSchema.EmployedBy).name).toEqual('DXOS');
    });

    // Expected to fail: same as the in-memory case — strong-dep resolution of a feed relation
    // pointing at a database object is not yet implemented. Unskip once the feature lands.
    test.fails('after reload (from disk)', async () => {
      const [spaceKey] = PublicKey.randomSequence();
      await using peer = await builder.createPeer({ types: TYPES });

      let feedId: string;
      let rootUrl: string;
      {
        await using db = await peer.createDatabase(spaceKey);
        rootUrl = db.rootUrl!;
        const feed = db.add(Feed.make({}));
        feedId = feed.id;
        await db.flush();

        const contact = db.add(Obj.make(TestSchema.Person, { name: 'Alice' }));
        const org = Obj.make(TestSchema.Organization, { name: 'DXOS' });
        const relation = Relation.make(TestSchema.EmployedBy, {
          [Relation.Source]: contact,
          [Relation.Target]: org,
          role: 'CTO',
        });
        await db.flush();
        await db.appendToFeed(feed, [org, relation]);
      }

      await peer.reload();
      {
        await using db = await peer.openDatabase(spaceKey, rootUrl);
        // Feed handles are created lazily after reload — look up the feed object by id.
        const [feedObj] = await db.query(Filter.id(feedId)).run();
        assert(feedObj != null, 'feed object must survive reload');

        // Re-fetch from disk: order is [org, relation]; the relation's source lives in the database.
        const [, surfaced] = await db.query(Query.select(Filter.everything()).from(Scope.feed(Feed.getQueueUri(feedObj as Feed.Feed)!))).run();
        assert(Relation.isRelation(surfaced), 'reloaded feed relation must surface');
        expect(Relation.getSource(surfaced as TestSchema.EmployedBy).name).toEqual('Alice');
        expect(Relation.getTarget(surfaced as TestSchema.EmployedBy).name).toEqual('DXOS');
      }
    });
  });

  //
  // Relation source/target — same database (regression baseline; should already pass).
  //

  describe('relation source/target — same database', () => {
    test('after reload (from disk)', async () => {
      const [spaceKey] = PublicKey.randomSequence();
      await using peer = await builder.createPeer({ types: TYPES });

      let relationId: string;
      {
        await using db = await peer.createDatabase(spaceKey);
        const alice = db.add(Obj.make(TestSchema.Person, { name: 'Alice' }));
        const bob = db.add(Obj.make(TestSchema.Person, { name: 'Bob' }));
        const relation = db.add(
          Relation.make(TestSchema.HasManager, {
            [Relation.Source]: bob,
            [Relation.Target]: alice,
          }),
        );
        relationId = relation.id;
        await db.flush();
      }

      await peer.reload();
      {
        await using db = await peer.openLastDatabase();
        const [obj] = await db.query(Filter.id(relationId)).run();
        assert(Relation.isRelation(obj), 'same-db relation must surface');
        expect((Relation.getSource(obj) as TestSchema.Person).name).toEqual('Bob');
        expect((Relation.getTarget(obj) as TestSchema.Person).name).toEqual('Alice');
      }
    });

    test('multi-peer (from network)', async () => {
      const [spaceKey] = PublicKey.randomSequence();
      await using network = await new TestReplicationNetwork().open();
      await using peer1 = await builder.createPeer({ types: TYPES });
      await using peer2 = await builder.createPeer({ types: TYPES });
      await peer1.host.addReplicator(Context.default(), await network.createReplicator());
      await peer2.host.addReplicator(Context.default(), await network.createReplicator());

      await using db1 = await peer1.createDatabase(spaceKey);
      const alice = db1.add(Obj.make(TestSchema.Person, { name: 'Alice' }));
      const bob = db1.add(Obj.make(TestSchema.Person, { name: 'Bob' }));
      const relation = db1.add(
        Relation.make(TestSchema.HasManager, {
          [Relation.Source]: bob,
          [Relation.Target]: alice,
        }),
      );
      await db1.flush();
      const heads = await db1.coreDatabase.getDocumentHeads();

      await using db2 = await peer2.openDatabase(spaceKey, db1.rootUrl!);
      await db2.coreDatabase.waitUntilHeadsReplicated(heads);
      await db2.coreDatabase.updateIndexes();

      const obj = await waitForRelation(db2, relation.id);
      assert(Relation.isRelation(obj), 'same-db relation must surface on a remote peer');
      expect((Relation.getSource(obj) as TestSchema.Person).name).toEqual('Bob');
      expect((Relation.getTarget(obj) as TestSchema.Person).name).toEqual('Alice');
    });
  });

  //
  // Relation source/target — automerge → automerge (cross-space).
  // Both databases share one hypergraph; the relation's target lives in a different space.
  //

  describe('relation source/target — cross-space (automerge → automerge)', () => {
    test('in-memory', async () => {
      await using peer = await builder.createPeer({ types: TYPES });
      await using dbA = await peer.createDatabase();
      await using dbB = await peer.createDatabase();

      const alice = dbB.add(Obj.make(TestSchema.Person, { name: 'Alice' }));
      const bob = dbA.add(Obj.make(TestSchema.Person, { name: 'Bob' }));
      await dbB.flush();
      const relation = dbA.add(
        Relation.make(TestSchema.HasManager, {
          [Relation.Source]: bob,
          [Relation.Target]: alice, // cross-space endpoint
        }),
      );
      await dbA.flush();

      const [obj] = await dbA.query(Filter.id(relation.id)).run();
      assert(Relation.isRelation(obj), 'cross-space relation must surface');
      expect((Relation.getSource(obj) as TestSchema.Person).name).toEqual('Bob');
      expect((Relation.getTarget(obj) as TestSchema.Person).name).toEqual('Alice');
    });
  });

  //
  // Parent strong dependency — automerge child → feed parent.
  //

  describe('parent strong dependency — automerge → feed', () => {
    test('in-memory', async () => {
      await using peer = await builder.createPeer({ types: TYPES });
      await using db = await peer.createDatabase();
      const feed = db.add(Feed.make({}));
      await db.flush();

      const parent = Obj.make(TestSchema.Organization, { name: 'DXOS' });
      await db.appendToFeed(feed, [parent]);

      const child = db.add(Obj.make(TestSchema.Person, { [Obj.Parent]: parent, name: 'John' }));
      await db.flush();

      const [obj] = await db.query(Filter.id(child.id)).run();
      assert(obj != null, 'child with a feed parent must surface');
      const resolvedParent = Obj.getParent(obj);
      assert(Obj.instanceOf(TestSchema.Organization, resolvedParent), 'parent must resolve to the feed object');
      expect(resolvedParent.name).toEqual('DXOS');
    });
  });

  //
  // Type (schema) strong dependency — stored schema must load before its objects surface.
  // Baseline (same-db) should already pass; guards against regressing the existing invariant.
  //

  describe('type (schema) strong dependency — automerge', () => {
    test('object with a stored schema surfaces after reload', async () => {
      const [spaceKey] = PublicKey.randomSequence();
      await using peer = await builder.createPeer();

      let objectId: string;
      let rootUrl: string;
      {
        await using db = await peer.createDatabase(spaceKey, {
          reactiveSchemaQuery: false,
          preloadSchemaOnOpen: false,
        });
        rootUrl = db.rootUrl!;
        const stored = await db.addType(TestSchema.Person);
        const object = db.add(Obj.make(stored, { name: 'Bob' }));
        objectId = object.id;
        await db.flush();
      }

      await peer.reload();
      {
        await using db = await peer.openDatabase(spaceKey, rootUrl, {
          reactiveSchemaQuery: false,
          preloadSchemaOnOpen: false,
        });
        const [obj] = await db.query(Filter.id(objectId)).run();
        assert(obj != null, 'object with a stored-schema type must surface (type is a strong dep)');
        expect((obj as TestSchema.Person).name).toEqual('Bob');
      }
    });
  });

  //
  // Non-strong-dep ref — a plain reference must NOT gate the holder's surfacing.
  //

  describe('non-strong-dep ref', () => {
    test('object surfaces even when its ref target is in an unreached feed', async () => {
      await using peer = await builder.createPeer({ types: TYPES });
      await using db = await peer.createDatabase();
      const feed = db.add(Feed.make({}));
      await db.flush();

      const employer = Obj.make(TestSchema.Organization, { name: 'DXOS' });
      await db.appendToFeed(feed, [employer]);

      // `employer` is a non-strong Ref field on Person — the person must surface without it loaded.
      const person = db.add(Obj.make(TestSchema.Person, { name: 'Alice', employer: Ref.make(employer) }));
      await db.flush();

      const [obj] = await db.query(Filter.id(person.id)).run();
      assert(obj != null, 'object must surface regardless of a non-strong ref');
      expect((obj as TestSchema.Person).name).toEqual('Alice');
    });
  });
});

// Replication is eventually consistent: waiting on heads + index updates is not always sufficient
// for an object to surface in a query (https://github.com/dxos/dxos/issues/7240).
const waitForRelation = (db: EchoDatabase, id: string) =>
  waitForCondition({
    timeout: 10_000,
    breakOnError: true,
    condition: async () => {
      const [obj] = await db.query(Filter.id(id)).run();
      return obj;
    },
  });
