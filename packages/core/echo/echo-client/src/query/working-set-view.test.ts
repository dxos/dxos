//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import { Filter, Obj, Query, Ref } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';

import { type DatabaseImpl } from '../proxy-db/index.ts';
import { EchoTestBuilder } from '../testing/index.ts';
import { WorkingSetView } from './working-set-view.ts';

describe('WorkingSetView', () => {
  let builder: EchoTestBuilder;
  let db: DatabaseImpl;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
    ({ db } = await builder.createDatabase({ types: [TestSchema.Person, TestSchema.Task] }));
  });

  afterEach(async () => {
    await builder.close();
  });

  const watch = (query: Query.Any) => {
    const view = new WorkingSetView(db);
    view.update(query.from(db).ast);
    let changes = 0;
    view.changed.on(() => {
      changes++;
    });
    return {
      ids: () => view.getResults().map((entry) => entry.id),
      changes: () => changes,
    };
  };

  const person = (name: string) => db.add(Obj.make(TestSchema.Person, { name, tasks: [] }));

  /** A task parented to `parent`, which holds a ref to it as a parent edge requires. */
  const childTask = (parent: TestSchema.Person | TestSchema.Task, title: string) => {
    const task = db.add(Obj.make(TestSchema.Task, { title }));
    if (Obj.instanceOf(TestSchema.Person, parent)) {
      Obj.update(parent, (parent) => parent.tasks?.push(Ref.make(task)));
    } else {
      Obj.update(parent, (parent) => {
        parent.previous = Ref.make(task);
      });
    }
    Obj.setParent(task, parent);
    return task;
  };

  test('a write outside a child-of query’s parents leaves it untouched', ({ expect }) => {
    const alice = person('alice');
    const bob = person('bob');
    const own = childTask(alice, 'own');
    const other = childTask(bob, 'other');
    const query = watch(Query.select(Filter.and(Filter.type(TestSchema.Task), Filter.childOf(alice))));
    expect(query.ids()).toEqual([own.id]);

    Obj.update(other, (other) => {
      other.title = 'renamed';
    });
    expect(query.changes()).toBe(0);

    const added = childTask(alice, 'added');
    expect(query.changes()).toBeGreaterThan(0);
    expect(query.ids()).toEqual([own.id, added.id].sort());
  });

  test('re-parenting moves an object into and out of a child-of query', ({ expect }) => {
    const alice = person('alice');
    const bob = person('bob');
    const task = childTask(alice, 'task');
    Obj.update(bob, (bob) => bob.tasks?.push(Ref.make(task)));
    const query = watch(Query.select(Filter.and(Filter.type(TestSchema.Task), Filter.childOf(bob))));
    expect(query.ids()).toEqual([]);

    Obj.setParent(task, bob);
    expect(query.ids()).toEqual([task.id]);

    Obj.setParent(task, alice);
    expect(query.ids()).toEqual([]);
  });

  test('moving the object between a member and its anchor moves the member', ({ expect }) => {
    const alice = person('alice');
    const bob = person('bob');
    const middle = childTask(alice, 'middle');
    const leaf = childTask(middle, 'leaf');
    Obj.update(bob, (bob) => bob.tasks?.push(Ref.make(middle)));
    const query = watch(
      Query.select(Filter.and(Filter.type(TestSchema.Task, { title: 'leaf' }), Filter.childOf(alice))),
    );
    expect(query.ids()).toEqual([leaf.id]);

    Obj.setParent(middle, bob);
    expect(query.ids()).toEqual([]);

    Obj.setParent(middle, alice);
    expect(query.ids()).toEqual([leaf.id]);
  });

  test('a write outside the anchor’s children leaves a children traversal untouched', ({ expect }) => {
    const alice = person('alice');
    const bob = person('bob');
    const own = childTask(alice, 'own');
    const other = childTask(bob, 'other');
    const query = watch(Query.select(Filter.id(alice.id)).children());
    expect(query.ids()).toEqual([own.id]);

    Obj.update(other, (other) => {
      other.title = 'renamed';
    });
    expect(query.changes()).toBe(0);

    const added = childTask(alice, 'added');
    expect(query.ids()).toEqual([own.id, added.id].sort());
  });

  test('deleting an ancestor of the anchor removes its children', ({ expect }) => {
    const alice = person('alice');
    const middle = childTask(alice, 'middle');
    const leaf = childTask(middle, 'leaf');
    const query = watch(Query.select(Filter.id(middle.id)).children());
    expect(query.ids()).toEqual([leaf.id]);

    db.remove(alice);
    expect(query.ids()).toEqual([]);
  });
});
