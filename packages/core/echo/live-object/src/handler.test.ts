//
// Copyright 2024 DXOS.org
//

import { inspect } from 'node:util';

import { describe, expect, test } from 'vitest';

import { isNode } from '@dxos/util';

import { subscribe } from './live';
import { live } from './object';
import { getProxyTarget, objectData } from './proxy';
import { updateCounter } from './testing';
import { type WithParentRef, getParent, symbolIsTypedObject } from './untyped-handler';

class TestClass {
  field = 'value';
  toJSON() {
    return { field: this.field };
  }
}

const TEST_OBJECT = {
  string: 'foo',
  number: 42,
  boolean: true,
  null: null,
  stringArray: ['1', '2', '3'],
  object: { field: 'bar' },
};

describe(`Reactive Object`, () => {
  test.skipIf(!isNode())('inspect', () => {
    const obj = live({ string: 'bar' });
    const str = inspect(obj, { colors: false });
    expect(str).to.eq(`{ string: 'bar' }`);
  });

  test('data symbol', async () => {
    const obj = live({ ...TEST_OBJECT });
    const objData: any = (obj as any)[objectData];
    expect(objData).to.deep.contain({
      '@type': `ReactiveObject`,
      ...TEST_OBJECT,
    });
  });

  test('can assign class instances', () => {
    const obj = live({}) as any;

    const classInstance = new TestClass();
    obj.classInstance = classInstance;
    expect(obj.classInstance!.field).to.eq('value');
    expect(obj.classInstance instanceof TestClass).to.eq(true);
    expect(obj.classInstance === classInstance).to.be.true;

    obj.classInstance!.field = 'baz';
    expect(obj.classInstance!.field).to.eq('baz');
  });

  describe('class instance equality', () => {
    test('toJSON', () => {
      const original = { classInstance: new TestClass() };
      const reactive = live(original);
      expect(JSON.stringify(reactive)).to.eq(JSON.stringify(original));
    });

    test('chai deep equal works', () => {
      const original = { classInstance: new TestClass() };
      const reactive = live(original);
      expect(reactive).to.deep.eq(original);
      expect(reactive).to.not.deep.eq({ ...original, number: 11 });
    });

    test('jest deep equal works', () => {
      const original = { classInstance: new TestClass() };
      const reactive = live(original);
      expect(reactive).toEqual(original);
      expect(reactive).not.toEqual({ ...original, number: 11 });
    });
  });

  describe('subscription updates', () => {
    test('subscribes to live object changes', () => {
      const obj = live({ field: 'foo' });
      using updates = updateCounter(obj);
      expect(updates.count, 'update count').to.eq(0);

      obj.field = 'bar';
      expect(updates.count, 'update count').to.eq(1);
    });

    test('not triggered by nested class instance changes', () => {
      const obj = live({ classInstance: new TestClass() });
      using updates = updateCounter(obj);
      expect(updates.count, 'update count').to.eq(0);

      // Changes to class instance fields don't trigger subscription updates
      // because class instances aren't wrapped in live proxies.
      obj.classInstance!.field = 'baz';
      expect(updates.count, 'update count').to.eq(0);
    });

    test('triggered by reassigning class instance', () => {
      const obj = live({ classInstance: new TestClass() });
      using updates = updateCounter(obj);
      expect(updates.count, 'update count').to.eq(0);

      // Reassigning the class instance does trigger an update.
      obj.classInstance = new TestClass();
      expect(updates.count, 'update count').to.eq(1);
    });
  });
});

describe('getters', () => {
  test('add getter to object', () => {
    let value = 'foo';
    const obj = live({
      get getter() {
        return value;
      },
    });
    expect(obj.getter).to.eq('foo');

    value = 'bar';
    expect(obj.getter).to.eq('bar');
  });

  test('subscription updates on inner object', () => {
    const innerObj = live({
      string: 'bar',
    });

    const obj = live({
      field: 1,
      get getter() {
        return innerObj.string;
      },
    });

    // Subscribe to innerObj to detect changes.
    let innerUpdateCount = 0;
    const unsubscribe = subscribe(innerObj, () => {
      innerUpdateCount++;
    });

    innerObj.string = 'baz';
    expect(obj.getter).to.eq('baz');
    expect(innerUpdateCount, 'inner update count').to.eq(1);

    // Changes to outer obj don't affect inner subscription.
    obj.field = 2;
    expect(innerUpdateCount, 'inner update count').to.eq(1);

    unsubscribe();
  });

  test('getter for array', () => {
    const value = [1];
    const obj = live({
      get getter() {
        return value;
      },
    });
    expect(obj.getter).to.have.length(1);

    value.push(2);
    expect(obj.getter).to.have.length(2);
  });
});

describe('nested object event bubbling', () => {
  test('parent receives event when nested object changes', () => {
    const obj = live({
      nested: {
        field: 'foo',
      },
    });
    using updates = updateCounter(obj);

    obj.nested.field = 'bar';
    expect(updates.count, 'update count').to.eq(1);
  });

  test('parent receives event when deeply nested object changes', () => {
    const obj = live({
      level1: {
        level2: {
          level3: {
            field: 'foo',
          },
        },
      },
    });
    using updates = updateCounter(obj);

    obj.level1.level2.level3.field = 'bar';
    expect(updates.count, 'update count').to.eq(1);
  });

  test('parent relationship established on write, not read', () => {
    const nested = { field: 'foo' };
    const obj = live<{ nested?: { field: string } }>({});
    using updates = updateCounter(obj);

    // Just reading the object won't establish parent relationship.
    obj.nested;
    expect(updates.count).to.eq(0);

    // Assigning establishes the parent relationship.
    obj.nested = nested;
    expect(updates.count).to.eq(1);

    // Now changes to nested bubble up.
    obj.nested!.field = 'bar';
    expect(updates.count).to.eq(2);
  });

  test('nested object assigned after init receives events', () => {
    const nested = { field: 'foo' };
    const obj = live<{ nested?: { field: string } }>({});
    using updates = updateCounter(obj);

    // Assign nested object after live() was called.
    obj.nested = nested;
    expect(updates.count).to.eq(1);

    // Changes to nested should bubble up.
    obj.nested!.field = 'bar';
    expect(updates.count, 'nested change should bubble to parent').to.eq(2);
  });

  test('multiple inbound pointers - parent is reassigned', () => {
    const shared: { field: string } = { field: 'foo' };
    const obj1 = live<{ nested?: typeof shared }>({});
    const obj2 = live<{ nested?: typeof shared }>({});

    const obj1Target = getProxyTarget(obj1);
    const obj2Target = getProxyTarget(obj2);

    // First assignment.
    obj1.nested = shared;

    // shared's parent should be obj1's raw target.
    expect(getParent(shared)).to.equal(obj1Target);

    // Second assignment.
    obj2.nested = shared;

    // shared's parent should now be obj2's raw target, not obj1's.
    expect(getParent(shared)).to.equal(obj2Target);
  });

  test('multiple inbound pointers - last assignment wins', () => {
    const shared: { field: string } = { field: 'foo' };
    const obj1 = live<{ nested?: typeof shared }>({});
    const obj2 = live<{ nested?: typeof shared }>({});

    const obj2Target = getProxyTarget(obj2);

    using updates1 = updateCounter(obj1);
    using updates2 = updateCounter(obj2);

    // First assignment - shared is assigned to obj1.
    obj1.nested = shared;
    expect(updates1.count).to.eq(1);

    // Second assignment - same object re-assigned to obj2.
    // This takes over parent (shared's parent is now obj2's target).
    obj2.nested = shared;
    expect(updates2.count).to.eq(1);

    // Verify parent is obj2's target.
    expect(getParent(shared), 'parent should be obj2 target').to.eq(obj2Target);

    // Now changes through obj2.nested go to obj2.
    // Note: we must modify through the proxy (obj2.nested), not the original reference.
    obj2.nested!.field = 'bar';
    expect(updates2.count, 'obj2 should receive bubbled event').to.eq(2);

    // obj1.nested still points to the same underlying object,
    // but since parent was reassigned, changes don't bubble to obj1.
    // However, obj1 itself won't see bubbled events.
    expect(updates1.count, 'obj1 should not receive bubbled event').to.eq(1);
  });

  test('detaching clears parent relationship', () => {
    const obj = live({
      nested: {
        field: 'foo',
      },
    });
    using updates = updateCounter(obj);

    // Get reference to nested object.
    const nested = obj.nested;
    expect(updates.count).to.eq(0);

    // Changes bubble up.
    nested.field = 'bar';
    expect(updates.count).to.eq(1);

    // Detach by overwriting.
    obj.nested = { field: 'new' };
    expect(updates.count).to.eq(2);

    // Changes to detached object no longer bubble up.
    nested.field = 'baz';
    expect(updates.count, 'detached object should not bubble events').to.eq(2);
  });

  test('deleting property clears parent relationship', () => {
    const obj = live<{ nested?: { field: string } }>({
      nested: {
        field: 'foo',
      },
    });
    using updates = updateCounter(obj);

    // Get reference to nested object.
    const nested = obj.nested!;
    expect(updates.count).to.eq(0);

    // Delete the property.
    delete obj.nested;
    expect(updates.count).to.eq(1);

    // Changes to deleted object no longer bubble up.
    nested.field = 'bar';
    expect(updates.count, 'deleted object should not bubble events').to.eq(1);
  });

  test('typed object boundary stops propagation', () => {
    // Mark inner object as typed object.
    const innerRaw: WithParentRef & { field: string } = { field: 'foo' };
    innerRaw[symbolIsTypedObject] = true;

    const outer = live<{ inner?: typeof innerRaw }>({});
    const inner = live(innerRaw);
    using outerUpdates = updateCounter(outer);
    using innerUpdates = updateCounter(inner);

    outer.inner = inner as any;
    expect(outerUpdates.count).to.eq(1);
    expect(innerUpdates.count).to.eq(0);

    // Changes to typed object trigger its own event but don't propagate to parent.
    inner.field = 'bar';
    expect(innerUpdates.count, 'inner should receive event').to.eq(1);
    expect(outerUpdates.count, 'outer should not receive bubbled event from typed object').to.eq(1);
  });

  test('nested objects within typed object bubble to typed object but not beyond', () => {
    // Mark root as typed object.
    const rootRaw: WithParentRef & { nested?: { deep?: { field: string } } } = {
      nested: {
        deep: {
          field: 'foo',
        },
      },
    };
    rootRaw[symbolIsTypedObject] = true;

    const container = live<{ typedRoot?: typeof rootRaw }>({});
    const typedRoot = live(rootRaw);
    using containerUpdates = updateCounter(container);
    using typedRootUpdates = updateCounter(typedRoot);

    container.typedRoot = typedRoot as any;
    expect(containerUpdates.count).to.eq(1);

    // Changes to deeply nested object within typed root bubble to typed root.
    typedRoot.nested!.deep!.field = 'bar';
    expect(typedRootUpdates.count, 'typed root should receive bubbled event').to.eq(1);
    // But not beyond to container.
    expect(containerUpdates.count, 'container should not receive event from beyond typed boundary').to.eq(1);
  });

  test('parent not set on typed objects', () => {
    const typedRaw: WithParentRef & { field: string } = { field: 'foo' };
    typedRaw[symbolIsTypedObject] = true;

    const container = live<{ typed?: typeof typedRaw }>({});

    container.typed = typedRaw;

    // Typed object should not have parent set.
    expect(getParent(typedRaw)).to.be.undefined;
  });
});
