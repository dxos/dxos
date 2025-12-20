//
// Copyright 2025 DXOS.org
//

import { Registry } from '@dxos/effect-atom-solid';
import { render, waitFor } from '@solidjs/testing-library';
import { type JSX } from 'solid-js';
import { describe, expect, test } from 'vitest';

import type { Entity } from '@dxos/echo';
import { Obj } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import { createObject } from '@dxos/echo-db';

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

    render(() => {
      const value = useObject(obj);
      result = value();
      return <div>test</div> as JSX.Element;
    }, { wrapper: Wrapper });

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

    render(() => {
      const value = useObject(obj, 'name');
      result = value();
      return <div>test</div> as JSX.Element;
    }, { wrapper: Wrapper });

    expect(result).toBe('Test');
  });

  test('updates when object property changes', async () => {
    const obj = createObject(
      Obj.make(TestSchema.Person, { name: 'Test', username: 'test', email: 'test@example.com' }),
    ) as Entity.Entity<TestSchema.Person>;
    const registry = Registry.make();
    const Wrapper = createWrapper(registry);

    let result: string | undefined;

    const { getByTestId } = render(() => {
      const value = useObject(obj, 'name');
      result = value();
      return <div data-testid='value'>{value()}</div> as JSX.Element;
    }, { wrapper: Wrapper });

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

    render(() => {
      const value = useObject(obj);
      result = value();
      return <div>test</div> as JSX.Element;
    }, { wrapper: Wrapper });

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

    render(() => {
      const value = useObject(obj, 'name');
      result = value();
      return <div>test</div> as JSX.Element;
    }, { wrapper: Wrapper });

    expect(result).toBe('Test');

    // Update a different property
    obj.email = 'newemail@example.com';

    // Wait a bit to ensure no update happens
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Name should still be 'Test'
    expect(result).toBe('Test');
  });
});

