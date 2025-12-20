//
// Copyright 2025 DXOS.org
//

import { Registry } from '@dxos/effect-atom-solid';
import { render, waitFor } from '@solidjs/testing-library';
import { type JSX } from 'solid-js';
import { describe, expect, test } from 'vitest';

import { Obj } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import { createObject } from '@dxos/echo-db';

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

    render(() => {
      updateFn = useObjectUpdate(obj);
      return <div>test</div> as JSX.Element;
    }, { wrapper: Wrapper });

    expect(typeof updateFn).toBe('function');
  });

  test('returns update function for property', () => {
    const obj = createObject(
      Obj.make(TestSchema.Person, { name: 'Test', username: 'test', email: 'test@example.com' }),
    );
    const registry = Registry.make();
    const Wrapper = createWrapper(registry);

    let updateFn: ((value: string | ((current: string) => string)) => void) | undefined;

    render(() => {
      updateFn = useObjectUpdate(obj, 'name');
      return <div>test</div> as JSX.Element;
    }, { wrapper: Wrapper });

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

    render(() => {
      updateFn = useObjectUpdate(obj);
      const objValue = useObject(obj);
      value = objValue;
      return <div>test</div> as JSX.Element;
    }, { wrapper: Wrapper });

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

    render(() => {
      updateFn = useObjectUpdate(obj, 'name');
      const nameValue = useObject(obj, 'name');
      value = nameValue;
      return <div>test</div> as JSX.Element;
    }, { wrapper: Wrapper });

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

    render(() => {
      updateFn = useObjectUpdate(obj, 'name');
      const nameValue = useObject(obj, 'name');
      value = nameValue;
      return <div>test</div> as JSX.Element;
    }, { wrapper: Wrapper });

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
      return <div>test</div> as JSX.Element;
    };

    render(() => <TestComponent />, { wrapper: Wrapper });

    // Function should be the same reference (memoized)
    expect(updateFn).toBeDefined();
    expect(capturedFn).toBeDefined();
    expect(updateFn).toBe(capturedFn);
  });
});

