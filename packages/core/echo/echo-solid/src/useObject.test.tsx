//
// Copyright 2025 DXOS.org
//

import { render, waitFor } from '@solidjs/testing-library';
import { type JSX, createSignal } from 'solid-js';
import { describe, expect, test } from 'vitest';

import type { Entity } from '@dxos/echo';
import { Obj } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import { createObject } from '@dxos/echo-db';
import { Registry } from '@dxos/effect-atom-solid';
import { RegistryProvider } from '@dxos/effect-atom-solid';

import { useObject } from './useObject';

const createWrapper = (registry: Registry.Registry) => {
  return (props: { children: JSX.Element }) => (
    <RegistryProvider registry={registry}>{props.children}</RegistryProvider>
  );
};

describe('useObject', () => {
  test('returns entire object when property is not provided', () => {
    const obj = createObject(
      Obj.make(TestSchema.Person, { name: 'Test', username: 'test', email: 'test@example.com' }),
    );
    const registry = Registry.make();
    const Wrapper = createWrapper(registry);

    let result: Entity.Unknown | undefined;

    render(
      () => {
        const value = useObject(obj);
        result = value();
        return (<div>test</div>) as JSX.Element;
      },
      { wrapper: Wrapper },
    );

    expect(result).toBe(obj);
    expect((result as any)?.name).toBe('Test');
  });

  test('returns property value when property is provided', () => {
    const obj = createObject(
      Obj.make(TestSchema.Person, { name: 'Test', username: 'test', email: 'test@example.com' }),
    ) as Entity.Entity<TestSchema.Person>;
    const registry = Registry.make();
    const Wrapper = createWrapper(registry);

    let result: string | undefined;

    render(
      () => {
        const value = useObject(obj, 'name');
        result = value();
        return (<div>test</div>) as JSX.Element;
      },
      { wrapper: Wrapper },
    );

    expect(result).toBe('Test');
  });

  test('updates when object property changes', async () => {
    const obj = createObject(
      Obj.make(TestSchema.Person, { name: 'Test', username: 'test', email: 'test@example.com' }),
    ) as Entity.Entity<TestSchema.Person>;
    const registry = Registry.make();
    const Wrapper = createWrapper(registry);

    let result: string | undefined;

    const { getByTestId } = render(
      () => {
        const value = useObject(obj, 'name');
        result = value();
        return (<div data-testid='value'>{value()}</div>) as JSX.Element;
      },
      { wrapper: Wrapper },
    );

    expect(result).toBe('Test');
    expect(getByTestId('value').textContent).toBe('Test');

    // Update the property directly on the object
    obj.name = 'Updated';

    // Wait for reactivity to update
    await waitFor(() => {
      expect(getByTestId('value').textContent).toBe('Updated');
    });
  });

  test('updates when entire object changes', async () => {
    const obj = createObject(
      Obj.make(TestSchema.Person, { name: 'Test', username: 'test', email: 'test@example.com' }),
    );
    const registry = Registry.make();
    const Wrapper = createWrapper(registry);

    let result: Entity.Unknown | undefined;

    render(
      () => {
        const value = useObject(obj);
        result = value();
        return (<div>test</div>) as JSX.Element;
      },
      { wrapper: Wrapper },
    );

    expect((result as any)?.name).toBe('Test');

    // Update a property on the object
    (obj as any).name = 'Updated';

    // Wait for reactivity to update
    await waitFor(() => {
      expect((result as any)?.name).toBe('Updated');
    });
  });

  test('property atom does not update when other properties change', async () => {
    const obj = createObject(
      Obj.make(TestSchema.Person, { name: 'Test', username: 'test', email: 'test@example.com' }),
    ) as Entity.Entity<TestSchema.Person>;
    const registry = Registry.make();
    const Wrapper = createWrapper(registry);

    let result: string | undefined;

    render(
      () => {
        const value = useObject(obj, 'name');
        result = value();
        return (<div>test</div>) as JSX.Element;
      },
      { wrapper: Wrapper },
    );

    expect(result).toBe('Test');

    // Update a different property
    obj.email = 'newemail@example.com';

    // Name should still be 'Test'
    expect(result).toBe('Test');
  });

  test('works with accessor function for entire object', () => {
    const obj = createObject(
      Obj.make(TestSchema.Person, { name: 'Test', username: 'test', email: 'test@example.com' }),
    );
    const registry = Registry.make();
    const Wrapper = createWrapper(registry);

    let result: Entity.Unknown | undefined;

    render(
      () => {
        const value = useObject(() => obj);
        result = value();
        return (<div>test</div>) as JSX.Element;
      },
      { wrapper: Wrapper },
    );

    expect(result).toBe(obj);
    expect((result as any)?.name).toBe('Test');
  });

  test('works with accessor function for property', () => {
    const obj = createObject(
      Obj.make(TestSchema.Person, { name: 'Test', username: 'test', email: 'test@example.com' }),
    ) as Entity.Entity<TestSchema.Person>;
    const registry = Registry.make();
    const Wrapper = createWrapper(registry);

    let result: string | undefined;

    render(
      () => {
        const value = useObject(() => obj, 'name');
        result = value();
        return (<div>test</div>) as JSX.Element;
      },
      { wrapper: Wrapper },
    );

    expect(result).toBe('Test');
  });

  test('reactively tracks changes when accessor returns different object', async () => {
    const obj1 = createObject(
      Obj.make(TestSchema.Person, { name: 'Test1', username: 'test1', email: 'test1@example.com' }),
    ) as Entity.Entity<TestSchema.Person>;
    const obj2 = createObject(
      Obj.make(TestSchema.Person, { name: 'Test2', username: 'test2', email: 'test2@example.com' }),
    ) as Entity.Entity<TestSchema.Person>;
    const registry = Registry.make();
    const Wrapper = createWrapper(registry);

    const [objSignal, setObjSignal] = createSignal<Entity.Entity<TestSchema.Person>>(obj1);
    let valueAccessor: (() => string) | undefined;

    const { getByTestId } = render(
      () => {
        const value = useObject(objSignal, 'name');
        valueAccessor = value;
        return (<div data-testid='value'>{value()}</div>) as JSX.Element;
      },
      { wrapper: Wrapper },
    );

    expect(valueAccessor?.()).toBe('Test1');
    expect(getByTestId('value').textContent).toBe('Test1');

    // Change the object via signal
    setObjSignal(() => obj2);

    // Wait for reactivity to update
    await waitFor(() => {
      expect(getByTestId('value').textContent).toBe('Test2');
    });
    expect(valueAccessor?.()).toBe('Test2');
  });

  test('reactively tracks entire object when accessor returns different object', async () => {
    const obj1 = createObject(
      Obj.make(TestSchema.Person, { name: 'Test1', username: 'test1', email: 'test1@example.com' }),
    );
    const obj2 = createObject(
      Obj.make(TestSchema.Person, { name: 'Test2', username: 'test2', email: 'test2@example.com' }),
    );
    const registry = Registry.make();
    const Wrapper = createWrapper(registry);

    const [objSignal, setObjSignal] = createSignal(obj1);
    let valueAccessor: (() => Entity.Unknown) | undefined;

    render(
      () => {
        const value = useObject(objSignal);
        valueAccessor = value;
        return (<div>test</div>) as JSX.Element;
      },
      { wrapper: Wrapper },
    );

    expect((valueAccessor?.() as any)?.name).toBe('Test1');

    // Change the object via signal
    setObjSignal(() => obj2);

    // Wait for reactivity to update
    await waitFor(() => {
      expect((valueAccessor?.() as any)?.name).toBe('Test2');
    });
    expect((valueAccessor?.() as any)?.username).toBe('test2');
  });
});
