//
// Copyright 2026 DXOS.org
//

import { RegistryContext } from '@effect/atom-react/RegistryContext';
import { act, renderHook } from '@testing-library/react';
import * as AtomRegistry from 'effect/reactivity/AtomRegistry';
import React, { type PropsWithChildren } from 'react';
import { describe, expect, test } from 'vitest';

import { Obj } from '@dxos/echo';
import { createObject } from '@dxos/echo-client';
import { TestSchema } from '@dxos/echo/testing';

import { useLabel, useLabels } from './useLabel.ts';

const createWrapper = (registry: AtomRegistry.AtomRegistry) => {
  return ({ children }: PropsWithChildren) => (
    <RegistryContext.Provider value={registry}>{children}</RegistryContext.Provider>
  );
};

describe('useLabel', () => {
  test('re-renders on a rename and not on other edits', () => {
    const obj: TestSchema.Person = createObject(Obj.make(TestSchema.Person, { name: 'Alice', email: 'a@example.com' }));
    const wrapper = createWrapper(AtomRegistry.make());
    let renders = 0;
    const { result } = renderHook(
      () => {
        renders++;
        return useLabel(obj);
      },
      { wrapper },
    );
    expect(result.current).toBe('Alice');
    const baseline = renders;

    act(() => {
      Obj.update(obj, (obj) => {
        obj.email = 'b@example.com';
      });
    });
    expect(renders).toBe(baseline);

    act(() => {
      Obj.update(obj, (obj) => {
        obj.name = 'Bob';
      });
    });
    expect(result.current).toBe('Bob');
  });

  test('reads a snapshot as is, with the typename fallback', () => {
    const obj: TestSchema.Person = createObject(Obj.make(TestSchema.Person, { name: 'Alice' }));
    const wrapper = createWrapper(AtomRegistry.make());
    const { result } = renderHook(() => useLabel(Obj.getSnapshot(obj)), { wrapper });
    expect(result.current).toBe('Alice');

    const unnamed: TestSchema.Person = createObject(Obj.make(TestSchema.Person, {}));
    const { result: fallback } = renderHook(() => useLabel(unnamed, { fallback: 'typename' }), { wrapper });
    expect(fallback.current).toBe(Obj.getTypename(unnamed));
  });
});

describe('useLabels', () => {
  test('re-renders on a rename in the list and not on other edits', () => {
    const alice: TestSchema.Person = createObject(
      Obj.make(TestSchema.Person, { name: 'Alice', email: 'a@example.com' }),
    );
    const bob: TestSchema.Person = createObject(Obj.make(TestSchema.Person, { name: 'Bob' }));
    const people = [alice, bob];
    const wrapper = createWrapper(AtomRegistry.make());
    let renders = 0;
    const { result } = renderHook(
      () => {
        renders++;
        return useLabels(people);
      },
      { wrapper },
    );
    expect([...result.current.values()]).toEqual(['Alice', 'Bob']);
    const baseline = renders;

    act(() => {
      Obj.update(alice, (alice) => {
        alice.email = 'b@example.com';
      });
    });
    expect(renders).toBe(baseline);

    act(() => {
      Obj.update(bob, (bob) => {
        bob.name = 'Carol';
      });
    });
    expect(result.current.get(bob)).toBe('Carol');
  });
});
