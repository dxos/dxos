//
// Copyright 2025 DXOS.org
//

import { render, waitFor } from '@solidjs/testing-library';
import { createSignal, type JSX } from 'solid-js';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { type Entity, Filter, Obj, Ref, Type } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import { createObject } from '@dxos/echo-db';
import { EchoTestBuilder } from '@dxos/echo-db/testing';
import { Registry, RegistryProvider } from '@dxos/effect-atom-solid';

import { useRef } from './useRef';

const createWrapper = (registry: Registry.Registry) => {
  return (props: { children: JSX.Element }) => {
    return <RegistryProvider registry={registry}>{props.children}</RegistryProvider>;
  };
};

describe('useRef', () => {
  let testBuilder: EchoTestBuilder;
  let db: any;
  let registry: Registry.Registry;

  beforeEach(async () => {
    testBuilder = await new EchoTestBuilder().open();
    const { db: database } = await testBuilder.createDatabase();
    db = database;
    registry = Registry.make();
  });

  afterEach(async () => {
    await testBuilder.close();
  });

  test('returns undefined when ref is undefined', () => {
    const Wrapper = createWrapper(registry);

    let result: any;

    render(() => {
      const target = useRef(undefined);
      result = target();
      return <div>test</div> as JSX.Element;
    }, { wrapper: Wrapper });

    expect(result).toBeUndefined();
  });

  test('returns undefined when ref target is not loaded and loads it', async () => {
    await db.graph.schemaRegistry.register([TestSchema.Person]);

    // Create objects with a ref
    const targetObj = Obj.make(TestSchema.Person, { name: 'Target', username: 'target', email: 'target@example.com' });
    db.add(targetObj);
    await db.flush({ indexes: true });

    // Create a ref - target should be available since object is in memory
    const ref = Ref.make(targetObj);
    
    // Initially target should be available since object is in memory
    expect(ref.target).toBeDefined();
    
    const Wrapper = createWrapper(registry);

    let targetAccessor: (() => any) | undefined;

    function TestComponent() {
      const target = useRef(ref);
      targetAccessor = target;
      return <div data-testid='name'>{target()?.name || 'undefined'}</div> as JSX.Element;
    }

    const { getByTestId } = render(() => <TestComponent />, { wrapper: Wrapper });

    // Should load since target is available
    await waitFor(
      () => {
        expect(getByTestId('name').textContent).toBe('Target');
      },
      { timeout: 5000 },
    );

    // Get the actual result from the accessor
    const result = targetAccessor?.();
    expect(result?.name).toBe('Target');
  });

  test('returns target when ref is loaded', async () => {
    await db.graph.schemaRegistry.register([TestSchema.Person]);

    const targetObj = Obj.make(TestSchema.Person, { name: 'Target', username: 'target', email: 'target@example.com' });
    db.add(targetObj);
    await db.flush({ indexes: true });

    const ref = Ref.make(targetObj);
    const Wrapper = createWrapper(registry);

    let targetAccessor: (() => any) | undefined;

    function TestComponent() {
      const target = useRef(ref);
      targetAccessor = target;
      return <div data-testid='name'>{target()?.name || 'undefined'}</div> as JSX.Element;
    }

    const { getByTestId } = render(() => <TestComponent />, { wrapper: Wrapper });

    await waitFor(
      () => {
        expect(getByTestId('name').textContent).toBe('Target');
      },
      { timeout: 5000 },
    );

    // Get the actual result from the accessor
    const result = targetAccessor?.();
    expect(result?.name).toBe('Target');
    expect(result?.username).toBe('target');
  });

  test.skip('updates when target object changes', async () => {
    await db.graph.schemaRegistry.register([TestSchema.Person]);

    const targetObj = createObject(
      Obj.make(TestSchema.Person, { name: 'Target', username: 'target', email: 'target@example.com' }),
    ) as Entity.Entity<TestSchema.Person>;
    db.add(targetObj);
    await db.flush({ indexes: true });

    const ref = Ref.make(targetObj);
    const Wrapper = createWrapper(registry);

    let targetAccessor: (() => any) | undefined;

    function TestComponent() {
      const target = useRef(ref);
      targetAccessor = target;
      return <div data-testid='name'>{target()?.name || 'undefined'}</div> as JSX.Element;
    }

    const { getByTestId } = render(() => <TestComponent />, { wrapper: Wrapper });

    await waitFor(
      () => {
        expect(getByTestId('name').textContent).toBe('Target');
      },
      { timeout: 5000 },
    );

    // Update the target object
    targetObj.name = 'Updated';

    await waitFor(
      () => {
        expect(getByTestId('name').textContent).toBe('Updated');
      },
      { timeout: 5000 },
    );

    // Get the actual result from the accessor
    const result = targetAccessor?.();
    expect(result?.name).toBe('Updated');
  });

  test.skip('handles reactive ref accessor', async () => {
    await db.graph.schemaRegistry.register([TestSchema.Person]);

    const targetObj1 = Obj.make(TestSchema.Person, { name: 'Target1', username: 'target1', email: 'target1@example.com' });
    const targetObj2 = Obj.make(TestSchema.Person, { name: 'Target2', username: 'target2', email: 'target2@example.com' });
    db.add(targetObj1);
    db.add(targetObj2);
    await db.flush({ indexes: true });

    const [refSignal, setRefSignal] = createSignal<Ref.Ref<any> | undefined>(Ref.make(targetObj1));
    const Wrapper = createWrapper(registry);

    let targetAccessor: (() => any) | undefined;

    function TestComponent() {
      const target = useRef(refSignal());
      targetAccessor = target;
      return <div data-testid='name'>{target()?.name || 'undefined'}</div> as JSX.Element;
    }

    const { getByTestId } = render(() => <TestComponent />, { wrapper: Wrapper });

    await waitFor(
      () => {
        expect(getByTestId('name').textContent).toBe('Target1');
      },
      { timeout: 5000 },
    );

    // Get the actual result from the accessor
    let result = targetAccessor?.();
    expect(result?.name).toBe('Target1');

    // Change the ref
    setRefSignal(() => Ref.make(targetObj2));

    await waitFor(
      () => {
        expect(getByTestId('name').textContent).toBe('Target2');
      },
      { timeout: 5000 },
    );

    // Get the actual result from the accessor
    result = targetAccessor?.();
    expect(result?.name).toBe('Target2');
  });

  test('handles ref to Expando object', async () => {
    const targetObj = Obj.make(Type.Expando, { name: 'Expando Target', value: 42 });
    db.add(targetObj);
    await db.flush({ indexes: true });

    const ref = Ref.make(targetObj);
    const Wrapper = createWrapper(registry);

    let targetAccessor: (() => any) | undefined;

    function TestComponent() {
      const target = useRef(ref);
      targetAccessor = target;
      return <div data-testid='name'>{target()?.name || 'undefined'}</div> as JSX.Element;
    }

    const { getByTestId } = render(() => <TestComponent />, { wrapper: Wrapper });

    await waitFor(
      () => {
        expect(getByTestId('name').textContent).toBe('Expando Target');
      },
      { timeout: 5000 },
    );

    // Get the actual result from the accessor
    const result = targetAccessor?.();
    expect(result?.name).toBe('Expando Target');
    expect(result?.value).toBe(42);
  });
});

