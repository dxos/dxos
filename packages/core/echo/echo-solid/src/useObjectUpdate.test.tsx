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
import { useObjectUpdate } from './useObjectUpdate';

const createWrapper = (registry: Registry.Registry) => {
  return (props: { children: JSX.Element }) => (
    <RegistryProvider registry={registry}>{props.children}</RegistryProvider>
  );
};

describe('useObjectUpdate', () => {
  test('returns update function for entire object', () => {
    const obj = createObject(
      Obj.make(TestSchema.Person, { name: 'Test', username: 'test', email: 'test@example.com' }),
    );
    const registry = Registry.make();
    const Wrapper = createWrapper(registry);

    let updateFn: ((updater: (obj: any) => void) => void) | undefined;

    render(
      () => {
        updateFn = useObjectUpdate(obj);
        return (<div>test</div>) as JSX.Element;
      },
      { wrapper: Wrapper },
    );

    expect(typeof updateFn).toBe('function');
  });

  test('returns update function for property', () => {
    const obj = createObject(
      Obj.make(TestSchema.Person, { name: 'Test', username: 'test', email: 'test@example.com' }),
    );
    const registry = Registry.make();
    const Wrapper = createWrapper(registry);

    let updateFn: ((value: string | ((current: string) => string)) => void) | undefined;

    render(
      () => {
        updateFn = useObjectUpdate(obj, 'name');
        return (<div>test</div>) as JSX.Element;
      },
      { wrapper: Wrapper },
    );

    expect(typeof updateFn).toBe('function');
  });

  test('update function for object mutates the object', async () => {
    const obj = createObject(
      Obj.make(TestSchema.Person, { name: 'Test', username: 'test', email: 'test@example.com' }),
    );
    const registry = Registry.make();
    const Wrapper = createWrapper(registry);

    let updateFn: ((updater: (obj: any) => void) => void) | undefined;
    let value: any;

    render(
      () => {
        updateFn = useObjectUpdate(obj);
        const objValue = useObject(obj);
        value = objValue;
        return (<div>test</div>) as JSX.Element;
      },
      { wrapper: Wrapper },
    );

    expect(value()?.name).toBe('Test');

    // Update the object
    updateFn!((obj) => {
      obj.name = 'Updated';
    });

    // Wait for reactivity to update
    await waitFor(() => {
      expect(value()?.name).toBe('Updated');
    });
  });

  test('update function for property updates the property', async () => {
    const obj = createObject(
      Obj.make(TestSchema.Person, { name: 'Test', username: 'test', email: 'test@example.com' }),
    );
    const registry = Registry.make();
    const Wrapper = createWrapper(registry);

    let updateFn: ((value: string | ((current: string) => string)) => void) | undefined;
    let value: (() => string) | undefined;

    render(
      () => {
        updateFn = useObjectUpdate(obj, 'name');
        const nameValue = useObject(obj, 'name');
        value = nameValue;
        return (<div>test</div>) as JSX.Element;
      },
      { wrapper: Wrapper },
    );

    expect(value?.()).toBe('Test');

    // Update the property
    updateFn!('Updated');

    // Wait for reactivity to update
    await waitFor(() => {
      expect(value?.()).toBe('Updated');
    });
  });

  test('update function for property accepts updater function', async () => {
    const obj = createObject(
      Obj.make(TestSchema.Person, { name: 'Test', username: 'test', email: 'test@example.com' }),
    );
    const registry = Registry.make();
    const Wrapper = createWrapper(registry);

    let updateFn: ((value: string | ((current: string) => string)) => void) | undefined;
    let value: (() => string) | undefined;

    render(
      () => {
        updateFn = useObjectUpdate(obj, 'name');
        const nameValue = useObject(obj, 'name');
        value = nameValue;
        return (<div>test</div>) as JSX.Element;
      },
      { wrapper: Wrapper },
    );

    expect(value?.()).toBe('Test');

    // Update the property using updater function
    updateFn!((current) => `${current} Updated`);

    // Wait for reactivity to update
    await waitFor(() => {
      expect(value?.()).toBe('Test Updated');
    });
  });

  test('update function is stable', () => {
    const obj = createObject(
      Obj.make(TestSchema.Person, { name: 'Test', username: 'test', email: 'test@example.com' }),
    );
    const registry = Registry.make();
    const Wrapper = createWrapper(registry);

    let updateFn: ((value: string | ((current: string) => string)) => void) | undefined;
    let capturedFn: ((value: string | ((current: string) => string)) => void) | undefined;

    const TestComponent = () => {
      const update = useObjectUpdate(obj, 'name');
      if (!updateFn) {
        updateFn = update;
      }
      // Capture again to verify it's the same reference
      capturedFn = update;
      return (<div>test</div>) as JSX.Element;
    };

    render(() => <TestComponent />, { wrapper: Wrapper });

    // Function should be the same reference (memoized)
    expect(updateFn).toBeDefined();
    expect(capturedFn).toBeDefined();
    expect(updateFn).toBe(capturedFn);
  });

  test('works with accessor function for entire object', () => {
    const obj = createObject(
      Obj.make(TestSchema.Person, { name: 'Test', username: 'test', email: 'test@example.com' }),
    );
    const registry = Registry.make();
    const Wrapper = createWrapper(registry);

    let updateFn: ((updater: (obj: any) => void) => void) | undefined;

    render(
      () => {
        updateFn = useObjectUpdate(() => obj);
        return (<div>test</div>) as JSX.Element;
      },
      { wrapper: Wrapper },
    );

    expect(typeof updateFn).toBe('function');
  });

  test('works with accessor function for property', () => {
    const obj = createObject(
      Obj.make(TestSchema.Person, { name: 'Test', username: 'test', email: 'test@example.com' }),
    );
    const registry = Registry.make();
    const Wrapper = createWrapper(registry);

    let updateFn: ((value: string | ((current: string) => string)) => void) | undefined;

    render(
      () => {
        updateFn = useObjectUpdate(() => obj, 'name');
        return (<div>test</div>) as JSX.Element;
      },
      { wrapper: Wrapper },
    );

    expect(typeof updateFn).toBe('function');
  });

  test('update function works when object changes via accessor', async () => {
    const obj1 = createObject(
      Obj.make(TestSchema.Person, { name: 'Test1', username: 'test1', email: 'test1@example.com' }),
    );
    const obj2 = createObject(
      Obj.make(TestSchema.Person, { name: 'Test2', username: 'test2', email: 'test2@example.com' }),
    );
    const registry = Registry.make();
    const Wrapper = createWrapper(registry);

    const [objSignal, setObjSignal] = createSignal(obj1);
    let updateFn: ((updater: (obj: any) => void) => void) | undefined;
    let value: any;

    render(
      () => {
        updateFn = useObjectUpdate(objSignal);
        const objValue = useObject(objSignal);
        value = objValue;
        return (<div>test</div>) as JSX.Element;
      },
      { wrapper: Wrapper },
    );

    expect(value()?.name).toBe('Test1');

    // Update the object
    updateFn!((obj) => {
      obj.name = 'Updated1';
    });

    // Wait for reactivity to update
    await waitFor(() => {
      expect(value()?.name).toBe('Updated1');
    });

    // Change the object via signal
    setObjSignal(() => obj2);

    // Wait for the new object to be tracked
    await waitFor(() => {
      expect(value()?.name).toBe('Test2');
    });

    // Update the new object
    updateFn!((obj) => {
      obj.name = 'Updated2';
    });

    // Wait for reactivity to update
    await waitFor(() => {
      expect(value()?.name).toBe('Updated2');
    });
  });

  test('update function for property works when object changes via accessor', async () => {
    const obj1 = createObject(
      Obj.make(TestSchema.Person, { name: 'Test1', username: 'test1', email: 'test1@example.com' }),
    ) as Entity.Entity<TestSchema.Person>;
    const obj2 = createObject(
      Obj.make(TestSchema.Person, { name: 'Test2', username: 'test2', email: 'test2@example.com' }),
    ) as Entity.Entity<TestSchema.Person>;
    const registry = Registry.make();
    const Wrapper = createWrapper(registry);

    const [objSignal, setObjSignal] = createSignal<Entity.Entity<TestSchema.Person>>(obj1);
    let updateFn: ((value: string | ((current: string) => string)) => void) | undefined;
    let value: (() => string) | undefined;

    render(
      () => {
        updateFn = useObjectUpdate(objSignal, 'name');
        const nameValue = useObject(objSignal, 'name');
        value = nameValue;
        return (<div>test</div>) as JSX.Element;
      },
      { wrapper: Wrapper },
    );

    expect(value?.()).toBe('Test1');

    // Update the property
    updateFn!('Updated1');

    // Wait for reactivity to update
    await waitFor(() => {
      expect(value?.()).toBe('Updated1');
    });

    // Change the object via signal
    setObjSignal(() => obj2);

    // Wait for the new object to be tracked
    await waitFor(() => {
      expect(value?.()).toBe('Test2');
    });

    // Update the new object's property
    updateFn!('Updated2');

    // Wait for reactivity to update
    await waitFor(() => {
      expect(value?.()).toBe('Updated2');
    });
  });
});
