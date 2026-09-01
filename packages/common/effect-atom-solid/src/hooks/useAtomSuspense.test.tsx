//
// Copyright 2025 DXOS.org
//

import { render, waitFor } from '@solidjs/testing-library';
import * as AsyncResult from 'effect/unstable/reactivity/AsyncResult';
import * as Atom from 'effect/unstable/reactivity/Atom';
import { Suspense } from 'solid-js';
import { beforeEach, describe, expect, test } from 'vitest';

import { defaultRegistry } from '../registry.ts';
import { useAtomSuspense } from './useAtomSuspense.ts';

describe('useAtomSuspense', () => {
  beforeEach(() => {
    defaultRegistry.reset();
  });

  test('suspends while waiting for value', async () => {
    const atom = Atom.make<AsyncResult.AsyncResult<string, never>>(AsyncResult.initial());

    function Child() {
      const value = useAtomSuspense(atom);
      return <span data-testid='value'>{value()}</span>;
    }

    function TestComponent() {
      return (
        <Suspense fallback={<span data-testid='loading'>Loading</span>}>
          <Child />
        </Suspense>
      );
    }

    const { getByTestId } = render(() => <TestComponent />);
    expect(getByTestId('loading')).toBeTruthy();

    // Update atom
    defaultRegistry.set(atom, AsyncResult.success('ready'));

    await waitFor(() => {
      expect(getByTestId('value').textContent).toBe('ready');
    });
  });
});
