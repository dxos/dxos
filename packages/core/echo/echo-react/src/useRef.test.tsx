//
// Copyright 2025 DXOS.org
//

import * as Registry from '@effect-atom/atom/Registry';
import { RegistryContext } from '@effect-atom/atom-react';
import { renderHook, waitFor } from '@testing-library/react';
import React, { type PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Obj, Ref, Type } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import { EchoTestBuilder } from '@dxos/echo-db/testing';

import { useRef } from './useRef';

const createWrapper = (registry: Registry.Registry) => {
  return ({ children }: PropsWithChildren) => (
    <RegistryContext.Provider value={registry}>{children}</RegistryContext.Provider>
  );
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
    const wrapper = createWrapper(registry);

    const { result } = renderHook(() => useRef(undefined), { wrapper });

    expect(result.current).toBeUndefined();
  });

  test('returns target when ref is loaded', async () => {
    await db.graph.schemaRegistry.register([TestSchema.Person]);

    const targetObj = Obj.make(TestSchema.Person, { name: 'Target', username: 'target', email: 'target@example.com' });
    db.add(targetObj);
    await db.flush({ indexes: true });

    const ref = Ref.make(targetObj);
    const wrapper = createWrapper(registry);

    const { result } = renderHook(() => useRef(ref), { wrapper });

    await waitFor(() => {
      expect(result.current?.name).toBe('Target');
    });

    expect(result.current?.username).toBe('target');
  });

  test('handles ref to Expando object', async () => {
    const targetObj = Obj.make(Type.Expando, { name: 'Expando Target', value: 42 });
    db.add(targetObj);
    await db.flush({ indexes: true });

    const ref = Ref.make(targetObj);
    const wrapper = createWrapper(registry);

    const { result } = renderHook(() => useRef(ref), { wrapper });

    await waitFor(() => {
      expect(result.current?.name).toBe('Expando Target');
    });

    expect(result.current?.value).toBe(42);
  });

  test('updates when target object property changes', async () => {
    await db.graph.schemaRegistry.register([TestSchema.Person]);

    const targetObj = Obj.make(TestSchema.Person, { name: 'Target', username: 'target', email: 'target@example.com' });
    db.add(targetObj);
    await db.flush({ indexes: true });

    const ref = Ref.make(targetObj);
    const wrapper = createWrapper(registry);

    const { result } = renderHook(() => useRef(ref), { wrapper });

    await waitFor(() => {
      expect(result.current?.name).toBe('Target');
    });

    // Update the target object.
    targetObj.name = 'Updated Target';

    await waitFor(() => {
      expect(result.current?.name).toBe('Updated Target');
    });
  });

  test('handles ref change', async () => {
    await db.graph.schemaRegistry.register([TestSchema.Person]);

    const targetObj1 = Obj.make(TestSchema.Person, {
      name: 'Target1',
      username: 'target1',
      email: 'target1@example.com',
    });
    const targetObj2 = Obj.make(TestSchema.Person, {
      name: 'Target2',
      username: 'target2',
      email: 'target2@example.com',
    });
    db.add(targetObj1);
    db.add(targetObj2);
    await db.flush({ indexes: true });

    const ref1 = Ref.make(targetObj1);
    const ref2 = Ref.make(targetObj2);
    const wrapper = createWrapper(registry);

    const { result, rerender } = renderHook(({ ref }) => useRef(ref), {
      wrapper,
      initialProps: { ref: ref1 as Ref.Ref<any> | undefined },
    });

    await waitFor(() => {
      expect(result.current?.name).toBe('Target1');
    });

    // Change the ref.
    rerender({ ref: ref2 });

    await waitFor(() => {
      expect(result.current?.name).toBe('Target2');
    });
  });

  test('handles ref becoming undefined', async () => {
    await db.graph.schemaRegistry.register([TestSchema.Person]);

    const targetObj = Obj.make(TestSchema.Person, { name: 'Target', username: 'target', email: 'target@example.com' });
    db.add(targetObj);
    await db.flush({ indexes: true });

    const ref = Ref.make(targetObj);
    const wrapper = createWrapper(registry);

    const { result, rerender } = renderHook(({ ref }) => useRef(ref), {
      wrapper,
      initialProps: { ref: ref as Ref.Ref<any> | undefined },
    });

    await waitFor(() => {
      expect(result.current?.name).toBe('Target');
    });

    // Change the ref to undefined.
    rerender({ ref: undefined });

    await waitFor(() => {
      expect(result.current).toBeUndefined();
    });
  });
});
