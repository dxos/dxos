//
// Copyright 2022 DXOS.org
//

import * as Atom from '@effect-atom/atom/Atom';
import * as Registry from '@effect-atom/atom/Registry';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Trigger } from '@dxos/async';
import { Annotation, Obj } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';

import { EchoTestBuilder } from '../testing';
import { createSubscription } from './subscription';

describe('create subscription', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('updates are propagated', async () => {
    const { db } = await builder.createDatabase();
    const task = Obj.make(TestSchema.Expando, {});
    db.add(task);

    const counter = createUpdateCounter(task);

    Obj.update(task, (task) => {
      task.title = 'Test title';
    });
    expect(counter.value).to.equal(2);

    Obj.update(task, (task) => {
      task.title = 'Test title revision';
    });
    expect(counter.value).to.equal(3);
  });

  test('updates are synchronous', async () => {
    const { db } = await builder.createDatabase();
    const task = Obj.make(TestSchema.Expando, {});
    db.add(task);

    const actions: string[] = [];
    const selection = createSubscription(() => {
      actions.push('update');
    });
    selection.update([task]);
    // Initial update caused by changed selection.
    expect(actions).to.deep.equal(['update']);

    actions.push('before');
    Obj.update(task, (task) => {
      task.title = 'Test title';
    });
    actions.push('after');

    // NOTE: This order is required for input components in react to function properly when directly bound to ECHO objects.
    expect(actions).to.deep.equal(['update', 'before', 'update', 'after']);
  });

  test('latest value is available in subscription', async () => {
    const { db } = await builder.createDatabase();
    const task = Obj.make(TestSchema.Expando, {});
    db.add(task);

    let counter = 0;
    const title = new Trigger<string>();
    const selection = createSubscription(() => {
      if (counter === 1) {
        title.wake(task.title);
      }
      counter++;
    });
    selection.update([task]);

    Obj.update(task, (task) => {
      task.title = 'Test title';
    });
    expect(await title.wait()).to.equal('Test title');
  });

  test('accepts arbitrary selection', async () => {
    const selection = createSubscription(() => {});
    selection.update(['example', null, -1]);
  });

  test('updates for nested objects', async () => {
    const { db } = await builder.createDatabase();
    const task = Obj.make(TestSchema.Expando, { nested: { title: 'Test title' } });
    db.add(task);

    const counter = createUpdateCounter(task);

    expect(counter.value).to.equal(1);
    Obj.update(task, (task) => {
      task.nested.title = 'New title';
    });
    expect(counter.value).to.equal(2);
  });

  test('updates for deep nested objects', async () => {
    const { db } = await builder.createDatabase();
    const task = Obj.make(TestSchema.Expando, {
      nested: { deep_nested: { title: 'Test title' } },
    });
    db.add(task);

    const counter = createUpdateCounter(task);

    expect(counter.value).to.equal(1);
    Obj.update(task, (task) => {
      task.nested.deep_nested.title = 'New title';
    });
    expect(counter.value).to.equal(2);
  });

  test('subscribing directly to a nested record proxy is notified on mutation', async () => {
    const { db } = await builder.createDatabase();
    const task = Obj.make(TestSchema.Expando, { nested: { title: 'Test title' } });
    db.add(task);

    // The nested record proxy reuses the root object's event, so its own subscribers fire on
    // change (a derived proxy with its own event would never be notified by `core.updates`).
    let subscribeCalls = 0;
    const unsubscribe = Obj.subscribe(task.nested, () => {
      subscribeCalls++;
    });

    Obj.update(task, (task) => {
      task.nested.title = 'New title';
    });
    expect(subscribeCalls).toBeGreaterThan(0);

    unsubscribe();
  });

  test('updates for array objects', async () => {
    const { db } = await builder.createDatabase();
    const task = Obj.make(TestSchema.Expando, { array: ['Test value'] });
    db.add(task);

    const counter = createUpdateCounter(task);

    expect(counter.value).to.equal(1);
    Obj.update(task, (task) => {
      task.array[0] = 'New value';
    });
    expect(counter.value).to.equal(2);
  });

  test('updates for automerge array object fields', async () => {
    const { db } = await builder.createDatabase();
    const task = Obj.make(TestSchema.Expando, { array: [{ title: 'Test value' }] });
    db.add(task);

    const counter = createUpdateCounter(task);

    expect(counter.value).to.equal(1);
    Obj.update(task, (task) => {
      task.array[0].title = 'New value';
    });
    expect(counter.value).to.equal(2);
  });

  test('updates for nested automerge array object fields', async () => {
    const { db } = await builder.createDatabase();
    const nestedArrayHolder = { nested_array: [{ title: 'Test value' }] };
    const task = Obj.make(TestSchema.Expando, { array: [nestedArrayHolder] });
    db.add(task);

    const counter = createUpdateCounter(task);

    expect(counter.value).to.equal(1);
    Obj.update(task, (task) => {
      task.array[0].nested_array[0].title = 'New value';
    });
    expect(counter.value).to.equal(2);
  });

  test('updates for annotation (meta) changes', async () => {
    const { db } = await builder.createDatabase();
    const ColorAnnotation = Annotation.make({ id: 'org.dxos.test.color', schema: Schema.String });
    const task = Obj.make(TestSchema.Expando, {});
    db.add(task);

    const counter = createUpdateCounter(task);
    let subscribeCalls = 0;
    const unsubscribe = Obj.subscribe(task, () => {
      subscribeCalls++;
    });

    expect(counter.value).to.equal(1);
    Obj.update(task, (task) => {
      Annotation.set(task, ColorAnnotation, 'red');
    });
    expect(Annotation.get(task, ColorAnnotation).pipe(Option.getOrUndefined)).to.equal('red');
    // A meta/annotation mutation must notify the object's subscribers, like a data mutation.
    expect(counter.value).to.equal(2);
    expect(subscribeCalls).to.equal(1);

    // The snapshot (what `useObject`/`AtomObj` expose to React) must carry the annotation.
    const snapshot = Obj.getSnapshot(task);
    expect(Annotation.get(snapshot, ColorAnnotation).pipe(Option.getOrUndefined)).to.equal('red');

    unsubscribe();
  });

  test('updates for in-place annotation array mutation', async () => {
    const { db } = await builder.createDatabase();
    const OrderAnnotation = Annotation.make({
      id: 'org.dxos.test.order',
      schema: Schema.Record({ key: Schema.String, value: Schema.Array(Schema.String) }),
    });
    const task = Obj.make(TestSchema.Expando, {});
    db.add(task);
    Obj.update(task, (task) => Annotation.set(task, OrderAnnotation, { typeA: ['x', 'y'] }));

    let subscribeCalls = 0;
    const unsubscribe = Obj.subscribe(task, () => {
      subscribeCalls++;
    });

    // Splice/push the annotation array in place (no Annotation.set).
    Annotation.update(task, OrderAnnotation, (order) => {
      order.typeA.push('z');
    });

    expect(Annotation.get(task, OrderAnnotation).pipe(Option.getOrThrow).typeA).to.deep.equal(['x', 'y', 'z']);
    // An in-place annotation array mutation must notify subscribers, like a data mutation.
    expect(subscribeCalls).to.equal(1);

    unsubscribe();
  });

  test('atomProperty fires on in-place mutation (db-backed)', async () => {
    const { db } = await builder.createDatabase();
    const OrderAnnotation = Annotation.make({
      id: 'org.dxos.test.order2',
      schema: Schema.Record({ key: Schema.String, value: Schema.Array(Schema.String) }),
    });
    const task = Obj.make(TestSchema.Expando, {});
    db.add(task);
    Obj.update(task, (task) => Annotation.set(task, OrderAnnotation, { typeA: ['x', 'y'] }));

    const registry = Registry.make();
    const atomA = Annotation.atomProperty(task, OrderAnnotation, 'typeA');
    let fires = 0;
    registry.subscribe(atomA, () => {
      fires++;
    });
    registry.get(atomA);

    Annotation.update(task, OrderAnnotation, (order) => {
      order.typeA.push('z');
    });

    expect(registry.get(atomA)).to.deep.equal(['x', 'y', 'z']);
    expect(fires).toBeGreaterThan(0);
  });

  test('a derived atom depending on atomProperty recomputes on in-place mutation (db-backed)', async () => {
    const { db } = await builder.createDatabase();
    const OrderAnnotation = Annotation.make({
      id: 'org.dxos.test.order3',
      schema: Schema.Record({ key: Schema.String, value: Schema.Array(Schema.String) }),
    });
    const task = Obj.make(TestSchema.Expando, {});
    db.add(task);
    Obj.update(task, (task) => Annotation.set(task, OrderAnnotation, { typeA: ['x', 'y'] }));

    const registry = Registry.make();
    const atomA = Annotation.atomProperty(task, OrderAnnotation, 'typeA');
    // Mirror the graph-builder connector: a dependent computation that `get`s the atom.
    const derived = Atom.make((get) => get(atomA)?.length ?? 0);
    let derivedFires = 0;
    registry.subscribe(derived, () => {
      derivedFires++;
    });
    registry.get(derived);

    Annotation.update(task, OrderAnnotation, (order) => {
      order.typeA.push('z');
    });

    expect(registry.get(derived)).to.equal(3);
    expect(derivedFires).toBeGreaterThan(0);
  });
});

const createUpdateCounter = (object: any) => {
  const counter = { value: 0 };
  const selection = createSubscription(() => {
    counter.value++;
  });
  selection.update([object]);
  return counter;
};
