//
// Copyright 2026 DXOS.org
//

import * as Atom from 'effect/reactivity/Atom';
import * as Registry from 'effect/reactivity/AtomRegistry';
import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { type Database, DXN, Obj, Relation, Type } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { TestSchema } from '@dxos/schema/testing';

import { ObjectsTreeModel } from './ObjectsTree.tsx';

const WorksAt = Type.makeRelation(DXN.make('com.example.test.worksAt', '0.1.0'))({
  source: TestSchema.Person,
  target: TestSchema.Organization,
})(Schema.Struct({}));

const ROOT = 'objects';
const PERSONS = 2_000;
const ORGANIZATIONS = 10;
/** Persons with a relation; kept below `PERSONS` because seeding every entity through the test host dominates the run. */
const EMPLOYED = 200;

/**
 * Counts the queries that hold at least one subscriber — what the worker's QueryService keeps live.
 * A proxy rather than a spy on `db.query`: the model takes the database by reference, and results are
 * shared per query, so a result is counted once however many atoms subscribe to it.
 */
const trackLiveQueries = (db: Database.Database) => {
  const subscribers = new Map<object, number>();
  const wrapped = new WeakSet<object>();
  const proxy = new Proxy(db, {
    get: (target, property) => {
      if (property !== 'query') {
        return Reflect.get(target, property, target);
      }

      return (...args: unknown[]) => {
        const result = Reflect.apply(target.query, target, args);
        if (!wrapped.has(result)) {
          wrapped.add(result);
          const subscribe = result.subscribe.bind(result);
          result.subscribe = (...subscribeArgs: unknown[]) => {
            subscribers.set(result, (subscribers.get(result) ?? 0) + 1);
            const unsubscribe = subscribe(...subscribeArgs);
            return () => {
              subscribers.set(result, (subscribers.get(result) ?? 1) - 1);
              unsubscribe();
            };
          };
        }
        return result;
      };
    },
  });

  return { db: proxy, live: () => [...subscribers.values()].filter((count) => count > 0).length };
};

/** The rows `Tree` mounts: every visible id's item and props, recursing only into open branches. */
const walk = (model: ObjectsTreeModel) => {
  const tree = model.treeModel;
  return Atom.make((get) => {
    const rows: string[] = [];
    const visit = (parentId: string | undefined, parentPath: string[]) => {
      for (const id of get(tree.childIds(parentId))) {
        if (parentPath.includes(id) || !get(tree.item(id))) {
          continue;
        }
        const path = [...parentPath, id];
        const props = get(tree.itemProps(path));
        rows.push(id);
        if (props.parentOf !== undefined && get(tree.itemOpen(path))) {
          visit(id, path);
        }
      }
    };
    visit(undefined, [ROOT]);
    return rows;
  });
};

describe('ObjectsTreeModel', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('live queries track open nodes, not listed objects', { timeout: 180_000 }, async ({ expect }) => {
    const { db: database, graph } = await builder.createDatabase();
    graph.registry.add([TestSchema.Person, TestSchema.Organization, WorksAt]);
    const organizations = Array.from({ length: ORGANIZATIONS }, (_, index) =>
      database.add(Obj.make(TestSchema.Organization, { name: `Organization ${index}` })),
    );
    for (let index = 0; index < PERSONS; index++) {
      const person = database.add(Obj.make(TestSchema.Person, { name: `Person ${index}` }));
      if (index < EMPLOYED) {
        database.add(
          Relation.make(WorksAt, {
            [Relation.Source]: person,
            [Relation.Target]: organizations[index % ORGANIZATIONS],
          }),
        );
      }
    }
    await database.flush();

    const { db, live } = trackLiveQueries(database);
    const model = new ObjectsTreeModel(db, null, () => {});
    const registry = Registry.make();
    const rows = walk(model);
    const unsubscribe = registry.subscribe(rows, () => {});

    // Sampled while the space loads, which is when a per-row query would first appear.
    let peak = 0;
    await expect
      .poll(
        () => {
          peak = Math.max(peak, live());
          return registry.get(rows).length;
        },
        { timeout: 120_000 },
      )
      .toBe(PERSONS + ORGANIZATIONS);
    expect(peak).toBe(1);
    // Closed rows still know their children, from the space-wide index.
    const organization = organizations[0].id;
    expect(registry.get(model.treeModel.itemProps([ROOT, organization])).parentOf).toHaveLength(
      EMPLOYED / ORGANIZATIONS,
    );

    // What `ObjectsTree`'s `handleOpenChange` writes on a toggle.
    const open = (parentPath: string[], id: string, value: boolean) => {
      const path = [...parentPath, id];
      registry.set(model.openAtPath(path), value);
      registry.set(model.openPaths(id), value ? new Set([path.join('/')]) : new Set<string>());
    };

    open([ROOT], organization, true);
    await expect.poll(() => registry.get(rows).length).toBe(PERSONS + ORGANIZATIONS + EMPLOYED / ORGANIZATIONS);
    expect(live()).toBe(2);

    const relation = registry.get(model.treeModel.childIds(organization))[0];
    open([ROOT, organization], relation, true);
    await expect.poll(() => live()).toBe(3);

    // Closing releases the node's query.
    open([ROOT, organization], relation, false);
    open([ROOT], organization, false);
    await expect.poll(() => live()).toBe(1);
    expect(registry.get(rows)).toHaveLength(PERSONS + ORGANIZATIONS);

    unsubscribe();
    registry.dispose();
    await expect.poll(() => live()).toBe(0);
  });
});
