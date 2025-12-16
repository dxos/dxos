//
// Copyright 2025 DXOS.org
//

import * as Atom from '@effect-atom/atom/Atom';
import * as Result from '@effect-atom/atom/Result';
import { render, waitFor } from '@solidjs/testing-library';
import { Suspense } from 'solid-js';
import { beforeEach, describe, expect, test } from 'vitest';

import { defaultRegistry } from '../registry';

import { useAtomSuspense } from './useAtomSuspense';

describe('useAtomSuspense', () => {
  beforeEach(() => {
    defaultRegistry.reset();
  });

  test('suspends while waiting for value', async () => {
    const atom = Atom.make<Result.Result<string, never>>(Result.initial());

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
    defaultRegistry.set(atom, Result.success('ready'));

    await waitFor(() => {
      expect(getByTestId('value').textContent).toBe('ready');
    });
  });
});
