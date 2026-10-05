//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type Database, Error as EchoError, Filter, Obj, Order, Query, Ref, Relation } from '@dxos/echo';
import { DATA_NAMESPACE, EncodedReference } from '@dxos/echo-protocol';
import { TestSchema } from '@dxos/echo/testing';
import { invariant } from '@dxos/invariant';
import { SpaceId } from '@dxos/keys';

import { getObjectCore } from './echo-handler/index.ts';
import { EchoTestBuilder } from './testing/index.ts';

// End to end over a real peer: one replicated space and two local spaces on one graph, all hosted by the
// same ECHO host and reached through the same services.

const TYPES = [TestSchema.Person, TestSchema.Organization, TestSchema.Task, TestSchema.EmployedBy];

const ALL = 'all-accessible-spaces';

const setup = async () => {
  const builder = await new EchoTestBuilder().open();
  const peer = await builder.createPeer({ types: TYPES });
  const space = await peer.createDatabase();
  const graph = peer.client.graph;
  const env = {
    graph,
    space,
    local: await graph.localDatabase('settings'),
    other: await graph.localDatabase('drafts'),
    /** Closes both local databases in the client and opens them again, so they hydrate from the host. */
    reopen: async () => {
      for (const db of [env.local, env.other]) {
        const impl = graph.getDatabase(db.spaceId);
        invariant(impl);
        await peer.client.removeDatabase(impl);
      }
      env.local = await graph.localDatabase('settings');
      env.other = await graph.localDatabase('drafts');
      return { local: env.local, other: env.other };
    },
    [Symbol.asyncDispose]: async () => {
      await builder.close();
    },
  };
  return env;
};

const flushAll = async (...dbs: Database.Database[]) => {
  for (const db of dbs) {
    await db.flush({ indexes: true });
  }
};

const names = (entities: readonly unknown[]): string[] =>
  entities
    .map((entity) =>
      entity !== null && typeof entity === 'object' && 'name' in entity && typeof entity.name === 'string'
        ? entity.name
        : undefined,
    )
    .filter((name): name is string => name !== undefined)
    .sort();

describe('local databases on the graph', () => {
  describe('membership', () => {
    test('getDatabase returns a local database by its space id, and its graph is the shared one', async ({
      expect,
    }) => {
      await using env = await setup();
      expect(env.graph.getDatabase(env.local.spaceId)).toBe(env.local);
      expect(env.local.graph).toBe(env.graph);
      expect(env.space.graph).toBe(env.graph);
    });

    test('local databases have local space ids, replicated spaces do not', async ({ expect }) => {
      await using env = await setup();
      expect(SpaceId.isLocal(env.local.spaceId)).toBe(true);
      expect(SpaceId.isLocal(env.other.spaceId)).toBe(true);
      expect(env.local.spaceId).not.toBe(env.other.spaceId);
      expect(SpaceId.isLocal(env.space.spaceId)).toBe(false);
    });
  });

  describe('references from replicated data into local databases', () => {
    test('adding a space object that references a local object throws', async ({ expect }) => {
      await using env = await setup();
      const org = env.local.add(Obj.make(TestSchema.Organization, { name: 'Private' }));

      expect(() => env.space.add(Obj.make(TestSchema.Person, { name: 'Ada', employer: Ref.make(org) }))).toThrow(
        EchoError.LocalReferenceError,
      );
    });

    test('assigning a ref to a local object on a space object throws', async ({ expect }) => {
      await using env = await setup();
      const org = env.local.add(Obj.make(TestSchema.Organization, { name: 'Private' }));
      const person = env.space.add(Obj.make(TestSchema.Person, { name: 'Ada' }));

      expect(() =>
        Obj.update(person, (person) => {
          person.employer = Ref.make(org);
        }),
      ).toThrow(EchoError.LocalReferenceError);
      expect(() =>
        Obj.update(person, (person) => {
          person.tasks = [Ref.fromURI(Obj.getURI(org, { prefer: 'absolute' }))];
        }),
      ).toThrow(EchoError.LocalReferenceError);
      expect(person.employer).toBeUndefined();
    });

    test('a relation in a space with a local endpoint throws', async ({ expect }) => {
      await using env = await setup();
      const person = env.space.add(Obj.make(TestSchema.Person, { name: 'Ada' }));
      const org = env.local.add(Obj.make(TestSchema.Organization, { name: 'Private' }));

      expect(() =>
        env.space.add(
          Relation.make(TestSchema.EmployedBy, { [Relation.Source]: person, [Relation.Target]: org, role: 'x' }),
        ),
      ).toThrow(EchoError.LocalReferenceError);
    });

    test('a ref into a local database already in replicated data does not resolve or match', async ({ expect }) => {
      await using env = await setup();
      const org = env.local.add(Obj.make(TestSchema.Organization, { name: 'Private' }));
      const person = env.space.add(Obj.make(TestSchema.Person, { name: 'Ada' }));
      await flushAll(env.local, env.space);
      // Written below the API, as an older client or a hand-edited document could have.
      getObjectCore(person).setDecoded(
        [DATA_NAMESPACE, 'employer'],
        EncodedReference.fromURI(Obj.getURI(org, { prefer: 'absolute' })),
      );
      await flushAll(env.space);

      expect(person.employer?.target).toBeUndefined();
      await expect(person.employer?.tryLoad()).resolves.toBeUndefined();
      const employers = await env.graph.query(Query.select(Filter.id(person.id)).from(ALL).reference('employer')).run();
      expect(employers).toEqual([]);
      const staff = await env.graph
        .query(Query.select(Filter.id(org.id)).from(ALL).referencedBy(TestSchema.Person, 'employer'))
        .run();
      expect(staff).toEqual([]);
    });

    test('a local object may still reference a space object, and the graph still resolves local URIs', async ({
      expect,
    }) => {
      await using env = await setup();
      const spaceOrg = env.space.add(Obj.make(TestSchema.Organization, { name: 'Acme' }));
      const localOrg = env.local.add(Obj.make(TestSchema.Organization, { name: 'Private' }));
      const person = env.local.add(Obj.make(TestSchema.Person, { name: 'Ada', employer: Ref.make(spaceOrg) }));
      await flushAll(env.space, env.local);

      expect(await person.employer?.load()).toBe(spaceOrg);
      expect(await env.graph.makeRef(Obj.getURI(localOrg, { prefer: 'absolute' })).load()).toBe(localOrg);
    });
  });

  describe('ref resolution', () => {
    test('the graph resolves a local URI after the local database reopens', async ({ expect }) => {
      await using env = await setup();
      const org = env.local.add(Obj.make(TestSchema.Organization, { name: 'Acme' }));
      await flushAll(env.local);

      const { local } = await env.reopen();
      const loaded = await env.graph.makeRef(Obj.getURI(org, { prefer: 'absolute' })).load();
      expect(loaded).not.toBe(org);
      expect(Obj.getDatabase(loaded)).toBe(local);
      expect(loaded).toMatchObject({ id: org.id, name: 'Acme' });
    });

    test('a local object resolves a ref to a space object', async ({ expect }) => {
      await using env = await setup();
      const org = env.space.add(Obj.make(TestSchema.Organization, { name: 'Acme' }));
      const person = env.local.add(Obj.make(TestSchema.Person, { name: 'Ada', employer: Ref.make(org) }));
      await flushAll(env.space, env.local);

      expect(await person.employer?.load()).toBe(org);
    });

    test('a local object hydrated from storage resolves its ref to a space object', async ({ expect }) => {
      await using env = await setup();
      const org = env.space.add(Obj.make(TestSchema.Organization, { name: 'Acme' }));
      env.local.add(Obj.make(TestSchema.Person, { name: 'Ada', employer: Ref.make(org) }));
      await flushAll(env.space, env.local);

      const { local } = await env.reopen();
      const [person] = await local.query(Filter.type(TestSchema.Person)).run();
      expect(await person.employer?.load()).toBe(org);
    });

    test('a local object resolves a ref into another local database', async ({ expect }) => {
      await using env = await setup();
      const org = env.other.add(Obj.make(TestSchema.Organization, { name: 'Draft Org' }));
      env.local.add(Obj.make(TestSchema.Person, { name: 'Ada', employer: Ref.make(org) }));
      await flushAll(env.other, env.local);

      const { local, other } = await env.reopen();
      const [person] = await local.query(Filter.type(TestSchema.Person)).run();
      const loaded = await person.employer?.load();
      expect(loaded && Obj.getDatabase(loaded)).toBe(other);
      expect(loaded).toMatchObject({ id: org.id, name: 'Draft Org' });
    });

    test('a dangling ref into a local database resolves to nothing', async ({ expect }) => {
      await using env = await setup();
      const org = env.local.add(Obj.make(TestSchema.Organization, { name: 'Gone' }));
      const uri = Obj.getURI(org, { prefer: 'absolute' });
      env.local.remove(org);
      await flushAll(env.local);
      await env.local.runGarbageCollection();

      await env.reopen();
      await expect(env.graph.makeRef(uri).tryLoad()).resolves.toBeUndefined();
    });
  });

  describe('graph queries', () => {
    test('a scan returns objects from the space and from every local database', async ({ expect }) => {
      await using env = await setup();
      env.space.add(Obj.make(TestSchema.Person, { name: 'Space Ada' }));
      env.local.add(Obj.make(TestSchema.Person, { name: 'Local Bob' }));
      env.other.add(Obj.make(TestSchema.Person, { name: 'Draft Cy' }));
      await flushAll(env.space, env.local, env.other);

      const people = await env.graph.query(Query.select(Filter.type(TestSchema.Person)).from(ALL)).run();
      expect(names(people)).toEqual(['Draft Cy', 'Local Bob', 'Space Ada']);
    });

    test('a scan scoped to named databases returns only theirs', async ({ expect }) => {
      await using env = await setup();
      env.space.add(Obj.make(TestSchema.Person, { name: 'Space Ada' }));
      env.local.add(Obj.make(TestSchema.Person, { name: 'Local Bob' }));
      env.other.add(Obj.make(TestSchema.Person, { name: 'Draft Cy' }));
      await flushAll(env.space, env.local, env.other);

      const scoped = await env.graph
        .query(Query.select(Filter.type(TestSchema.Person)).from([env.space, env.local]))
        .run();
      expect(names(scoped)).toEqual(['Local Bob', 'Space Ada']);
    });

    test('a property filter applies in every database', async ({ expect }) => {
      await using env = await setup();
      env.space.add(Obj.make(TestSchema.Person, { name: 'Ada', age: 30 }));
      env.space.add(Obj.make(TestSchema.Person, { name: 'Old Space', age: 80 }));
      env.local.add(Obj.make(TestSchema.Person, { name: 'Bob', age: 30 }));
      env.local.add(Obj.make(TestSchema.Person, { name: 'Old Local', age: 81 }));
      await flushAll(env.space, env.local);

      const young = await env.graph.query(Query.select(Filter.type(TestSchema.Person, { age: 30 })).from(ALL)).run();
      expect(names(young)).toEqual(['Ada', 'Bob']);
    });

    test('a forward reference traversal crosses from one local database into another', async ({ expect }) => {
      await using env = await setup();
      const localOrg = env.other.add(Obj.make(TestSchema.Organization, { name: 'Local Org' }));
      const spaceOrg = env.space.add(Obj.make(TestSchema.Organization, { name: 'Space Org' }));
      env.local.add(Obj.make(TestSchema.Person, { name: 'Ada', employer: Ref.make(localOrg) }));
      env.space.add(Obj.make(TestSchema.Person, { name: 'Bob', employer: Ref.make(spaceOrg) }));
      await flushAll(env.other, env.local, env.space);

      const employers = await env.graph
        .query(Query.select(Filter.type(TestSchema.Person)).from(ALL).reference('employer'))
        .run();
      expect(names(employers)).toEqual(['Local Org', 'Space Org']);
    });

    test('a forward reference traversal crosses from a local database into the space', async ({ expect }) => {
      await using env = await setup();
      const spaceOrg = env.space.add(Obj.make(TestSchema.Organization, { name: 'Space Org' }));
      env.local.add(Obj.make(TestSchema.Person, { name: 'Ada', employer: Ref.make(spaceOrg) }));
      await flushAll(env.space, env.local);

      const employers = await env.graph
        .query(Query.select(Filter.type(TestSchema.Person)).from(env.local).reference('employer'))
        .run();
      expect(employers).toEqual([spaceOrg]);
    });

    test('an incoming reference traversal finds referrers in other databases', async ({ expect }) => {
      await using env = await setup();
      const org = env.space.add(Obj.make(TestSchema.Organization, { name: 'Acme' }));
      env.space.add(Obj.make(TestSchema.Person, { name: 'Space Ada', employer: Ref.make(org) }));
      env.local.add(Obj.make(TestSchema.Person, { name: 'Local Bob', employer: Ref.make(org) }));
      env.other.add(Obj.make(TestSchema.Person, { name: 'Unemployed' }));
      await flushAll(env.space, env.local, env.other);

      const staff = await env.graph
        .query(Query.select(Filter.id(org.id)).from(ALL).referencedBy(TestSchema.Person, 'employer'))
        .run();
      expect(names(staff)).toEqual(['Local Bob', 'Space Ada']);
    });

    test('an incoming reference traversal from a local anchor finds referrers in another local database', async ({
      expect,
    }) => {
      await using env = await setup();
      const org = env.local.add(Obj.make(TestSchema.Organization, { name: 'Local Org' }));
      env.other.add(Obj.make(TestSchema.Person, { name: 'Draft Ada', employer: Ref.make(org) }));
      await flushAll(env.local, env.other);

      const staff = await env.graph
        .query(
          Query.select(Filter.type(TestSchema.Organization, { name: 'Local Org' }))
            .from(ALL)
            .referencedBy(TestSchema.Person, 'employer'),
        )
        .run();
      expect(names(staff)).toEqual(['Draft Ada']);
    });

    test('a two-hop traversal crosses databases twice', async ({ expect }) => {
      await using env = await setup();
      const org = env.space.add(Obj.make(TestSchema.Organization, { name: 'Space Org' }));
      const manager = env.other.add(Obj.make(TestSchema.Person, { name: 'Manager', employer: Ref.make(org) }));
      env.local.add(Obj.make(TestSchema.Task, { title: 'Review', assignee: Ref.make(manager) }));
      await flushAll(env.space, env.other, env.local);

      const orgs = await env.graph
        .query(Query.select(Filter.type(TestSchema.Task)).from(ALL).reference('assignee').reference('employer'))
        .run();
      expect(names(orgs)).toEqual(['Space Org']);
    });

    // Relations are found from an endpoint in their own space; from the far endpoint they are not, as between
    // any two spaces, since the host seeks relations by endpoint within one space.
    test('a relation into another database is found from its source and reaches its target', async ({ expect }) => {
      await using env = await setup();
      const person = env.local.add(Obj.make(TestSchema.Person, { name: 'Ada' }));
      const org = env.space.add(Obj.make(TestSchema.Organization, { name: 'Acme' }));
      const relation = env.local.add(
        Relation.make(TestSchema.EmployedBy, {
          [Relation.Source]: person,
          [Relation.Target]: org,
          role: 'engineer',
        }),
      );
      await flushAll(env.space, env.local);

      const outgoing = await env.graph
        .query(Query.select(Filter.id(person.id)).from(ALL).sourceOf(TestSchema.EmployedBy))
        .run();
      expect(outgoing).toEqual([relation]);

      const employers = await env.graph
        .query(Query.select(Filter.id(person.id)).from(ALL).sourceOf(TestSchema.EmployedBy).target())
        .run();
      expect(employers).toEqual([org]);
    });

    test('children in a local database are found from a parent in the same database', async ({ expect }) => {
      await using env = await setup();
      const parent = env.local.add(Obj.make(TestSchema.Task, { title: 'Parent' }));
      const child = env.local.add(Obj.make(TestSchema.Task, { [Obj.Parent]: parent, title: 'Child' }));
      await flushAll(env.local);

      const children = await env.graph.query(Query.select(Filter.id(parent.id)).from(ALL).children()).run();
      expect(children).toEqual([child]);
      const parents = await env.graph.query(Query.select(Filter.id(child.id)).from(ALL).parent()).run();
      expect(parents).toEqual([parent]);
    });

    test('union and difference combine results from different databases', async ({ expect }) => {
      await using env = await setup();
      env.space.add(Obj.make(TestSchema.Person, { name: 'Ada', age: 30 }));
      env.local.add(Obj.make(TestSchema.Person, { name: 'Bob', age: 40 }));
      env.local.add(Obj.make(TestSchema.Organization, { name: 'Acme' }));
      await flushAll(env.space, env.local);

      const both = await env.graph
        .query(
          Query.all(
            Query.select(Filter.type(TestSchema.Person)),
            Query.select(Filter.type(TestSchema.Organization)),
          ).from(ALL),
        )
        .run();
      expect(names(both)).toEqual(['Acme', 'Ada', 'Bob']);

      const notForty = await env.graph
        .query(
          Query.without(
            Query.select(Filter.type(TestSchema.Person)),
            Query.select(Filter.type(TestSchema.Person, { age: 40 })),
          ).from(ALL),
        )
        .run();
      expect(names(notForty)).toEqual(['Ada']);
    });

    test('order and limit apply across databases', async ({ expect }) => {
      await using env = await setup();
      env.space.add(Obj.make(TestSchema.Person, { name: 'Carol' }));
      env.local.add(Obj.make(TestSchema.Person, { name: 'Alice' }));
      env.other.add(Obj.make(TestSchema.Person, { name: 'Bob' }));
      env.space.add(Obj.make(TestSchema.Person, { name: 'Dave' }));
      await flushAll(env.space, env.local, env.other);

      const firstTwo = await env.graph
        .query(Query.select(Filter.type(TestSchema.Person)).from(ALL).orderBy(Order.property('name', 'asc')).limit(2))
        .run();
      expect(firstTwo.map((person) => person.name)).toEqual(['Alice', 'Bob']);
    });

    test('a subscribed graph query updates when a local database changes', async ({ expect }) => {
      await using env = await setup();
      env.space.add(Obj.make(TestSchema.Person, { name: 'Ada' }));
      await flushAll(env.space);

      const result = env.graph.query(Query.select(Filter.type(TestSchema.Person)).from(ALL));
      const unsubscribe = result.subscribe(() => {});
      try {
        await expect.poll(() => names(result.results)).toEqual(['Ada']);
        env.local.add(Obj.make(TestSchema.Person, { name: 'Bob' }));
        await expect.poll(() => names(result.results)).toEqual(['Ada', 'Bob']);
        env.space.add(Obj.make(TestSchema.Person, { name: 'Cy' }));
        await expect.poll(() => names(result.results)).toEqual(['Ada', 'Bob', 'Cy']);
      } finally {
        unsubscribe();
      }
    });

    test('full-text search matches in the space and in local databases', async ({ expect }) => {
      await using env = await setup();
      env.space.add(Obj.make(TestSchema.Person, { name: 'Space Zebra' }));
      env.local.add(Obj.make(TestSchema.Person, { name: 'Local Zebra' }));
      env.local.add(Obj.make(TestSchema.Person, { name: 'Local Horse' }));
      for (const db of [env.space, env.local]) {
        await db.flush({ indexes: true, secondaryIndexes: true });
      }

      const zebras = await env.graph.query(Query.select(Filter.text('Zebra')).from(ALL)).run();
      expect(names(zebras)).toEqual(['Local Zebra', 'Space Zebra']);
    });

    test('lookup by id finds an object whichever database holds it', async ({ expect }) => {
      await using env = await setup();
      const spacePerson = env.space.add(Obj.make(TestSchema.Person, { name: 'Ada' }));
      const localPerson = env.other.add(Obj.make(TestSchema.Person, { name: 'Bob' }));
      await flushAll(env.space, env.other);

      const found = await env.graph.query(Query.select(Filter.id(spacePerson.id, localPerson.id)).from(ALL)).run();
      expect(names(found)).toEqual(['Ada', 'Bob']);
    });

    test('deleted objects are excluded unless the query asks for them', async ({ expect }) => {
      await using env = await setup();
      env.space.add(Obj.make(TestSchema.Person, { name: 'Space Alive' }));
      const gone = env.local.add(Obj.make(TestSchema.Person, { name: 'Local Gone' }));
      env.local.add(Obj.make(TestSchema.Person, { name: 'Local Alive' }));
      env.local.remove(gone);
      await flushAll(env.space, env.local);

      const alive = await env.graph.query(Query.select(Filter.type(TestSchema.Person)).from(ALL)).run();
      expect(names(alive)).toEqual(['Local Alive', 'Space Alive']);
      const all = await env.graph
        .query(Query.select(Filter.type(TestSchema.Person)).from(ALL).options({ deleted: 'include' }))
        .run();
      expect(names(all)).toEqual(['Local Alive', 'Local Gone', 'Space Alive']);
    });

    test('a traversal does not reach a deleted target in another database', async ({ expect }) => {
      await using env = await setup();
      const org = env.space.add(Obj.make(TestSchema.Organization, { name: 'Closed' }));
      env.local.add(Obj.make(TestSchema.Person, { name: 'Ada', employer: Ref.make(org) }));
      await flushAll(env.space, env.local);
      env.space.remove(org);
      await flushAll(env.space);

      const employers = await env.graph
        .query(Query.select(Filter.type(TestSchema.Person)).from(ALL).reference('employer'))
        .run();
      expect(employers).toEqual([]);
    });

    test('an array of refs is traversed into several databases', async ({ expect }) => {
      await using env = await setup();
      const spaceTask = env.space.add(Obj.make(TestSchema.Task, { title: 'Space task' }));
      const localTask = env.local.add(Obj.make(TestSchema.Task, { title: 'Local task' }));
      const draftTask = env.other.add(Obj.make(TestSchema.Task, { title: 'Draft task' }));
      env.local.add(
        Obj.make(TestSchema.Person, {
          name: 'Ada',
          tasks: [Ref.make(spaceTask), Ref.make(localTask), Ref.make(draftTask)],
        }),
      );
      await flushAll(env.space, env.local, env.other);

      const tasks = await env.graph
        .query(Query.select(Filter.type(TestSchema.Person)).from(ALL).reference('tasks'))
        .run();
      expect(tasks.map((task) => task.title).sort()).toEqual(['Draft task', 'Local task', 'Space task']);
    });

    test('a filter applies to the result of a traversal', async ({ expect }) => {
      await using env = await setup();
      const big = env.other.add(Obj.make(TestSchema.Organization, { name: 'Big' }));
      const small = env.space.add(Obj.make(TestSchema.Organization, { name: 'Small' }));
      env.local.add(Obj.make(TestSchema.Person, { name: 'Ada', employer: Ref.make(big) }));
      env.local.add(Obj.make(TestSchema.Person, { name: 'Bob', employer: Ref.make(small) }));
      await flushAll(env.other, env.space, env.local);

      const bigOnly = await env.graph
        .query(
          Query.select(Filter.type(TestSchema.Person))
            .from(ALL)
            .reference('employer')
            .select(Filter.type(TestSchema.Organization, { name: 'Big' })),
        )
        .run();
      expect(bigOnly).toEqual([big]);
    });

    test('skip and descending order page across databases', async ({ expect }) => {
      await using env = await setup();
      env.space.add(Obj.make(TestSchema.Person, { name: 'A', age: 1 }));
      env.local.add(Obj.make(TestSchema.Person, { name: 'B', age: 2 }));
      env.other.add(Obj.make(TestSchema.Person, { name: 'C', age: 3 }));
      env.space.add(Obj.make(TestSchema.Person, { name: 'D', age: 4 }));
      await flushAll(env.space, env.local, env.other);

      const page = await env.graph
        .query(
          Query.select(Filter.type(TestSchema.Person))
            .from(ALL)
            .orderBy(Order.property('age', 'desc'))
            .skip(1)
            .limit(2),
        )
        .run();
      expect(page.map((person) => person.name)).toEqual(['C', 'B']);
    });

    test('a relation stored in a local database still reaches its space endpoint after reopening', async ({
      expect,
    }) => {
      await using env = await setup();
      const person = env.local.add(Obj.make(TestSchema.Person, { name: 'Ada' }));
      const org = env.space.add(Obj.make(TestSchema.Organization, { name: 'Acme' }));
      env.local.add(
        Relation.make(TestSchema.EmployedBy, { [Relation.Source]: person, [Relation.Target]: org, role: 'engineer' }),
      );
      await flushAll(env.space, env.local);

      await env.reopen();
      const employers = await env.graph
        .query(Query.select(Filter.type(TestSchema.Person)).from(ALL).sourceOf(TestSchema.EmployedBy).target())
        .run();
      expect(employers).toEqual([org]);
    });

    test('a subscribed traversal updates when a cross-database ref changes', async ({ expect }) => {
      await using env = await setup();
      const first = env.space.add(Obj.make(TestSchema.Organization, { name: 'First' }));
      const second = env.space.add(Obj.make(TestSchema.Organization, { name: 'Second' }));
      const person = env.local.add(Obj.make(TestSchema.Person, { name: 'Ada', employer: Ref.make(first) }));
      await flushAll(env.space, env.local);

      const result = env.graph.query(Query.select(Filter.type(TestSchema.Person)).from(ALL).reference('employer'));
      const unsubscribe = result.subscribe(() => {});
      try {
        await expect.poll(() => names(result.results)).toEqual(['First']);
        Obj.update(person, (person) => {
          person.employer = Ref.make(second);
        });
        await expect.poll(() => names(result.results)).toEqual(['Second']);
      } finally {
        unsubscribe();
      }
    });

    test('a subscribed graph query follows a local database that is closed and reopened', async ({ expect }) => {
      await using env = await setup();
      env.local.add(Obj.make(TestSchema.Person, { name: 'Ada' }));
      await flushAll(env.local);

      const result = env.graph.query(Query.select(Filter.type(TestSchema.Person)).from(ALL));
      const unsubscribe = result.subscribe(() => {});
      try {
        await expect.poll(() => names(result.results)).toEqual(['Ada']);
        const { local } = await env.reopen();
        local.add(Obj.make(TestSchema.Person, { name: 'Bob' }));
        await expect.poll(() => names(result.results)).toEqual(['Ada', 'Bob']);
      } finally {
        unsubscribe();
      }
    });

    test('graph queries reach a local database opened after the space', async ({ expect }) => {
      await using env = await setup();
      env.space.add(Obj.make(TestSchema.Person, { name: 'Ada' }));
      await flushAll(env.space);
      expect(names(await env.graph.query(Query.select(Filter.type(TestSchema.Person)).from(ALL)).run())).toEqual([
        'Ada',
      ]);

      const late = await env.graph.localDatabase('late');
      late.add(Obj.make(TestSchema.Person, { name: 'Late' }));
      await late.flush();
      expect(names(await env.graph.query(Query.select(Filter.type(TestSchema.Person)).from(ALL)).run())).toEqual([
        'Ada',
        'Late',
      ]);
    });

    test('space-only graph queries are unaffected by local databases', async ({ expect }) => {
      await using env = await setup();
      env.space.add(Obj.make(TestSchema.Person, { name: 'Ada' }));
      env.local.add(Obj.make(TestSchema.Person, { name: 'Bob' }));
      await flushAll(env.space, env.local);

      const spaceOnly = await env.graph.query(Query.select(Filter.type(TestSchema.Person)).from(env.space)).run();
      expect(names(spaceOnly)).toEqual(['Ada']);
      expect(names(await env.space.query(Filter.type(TestSchema.Person)).run())).toEqual(['Ada']);
      expect(names(await env.local.query(Filter.type(TestSchema.Person)).run())).toEqual(['Bob']);
    });
  });
});
