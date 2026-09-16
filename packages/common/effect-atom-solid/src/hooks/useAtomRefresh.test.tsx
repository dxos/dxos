//
// Copyright 2025 DXOS.org
//

import { fireEvent, render, waitFor } from '@solidjs/testing-library';
import * as Atom from 'effect/unstable/reactivity/Atom';
import { beforeEach, describe, expect, test } from 'vitest';

import { defaultRegistry } from '../registry.ts';
import { useAtomRefresh } from './useAtomRefresh.ts';
import { useAtomValue } from './useAtomValue.ts';

describe('useAtomRefresh', () => {
  beforeEach(() => {
    // Reset the default registry between tests
    defaultRegistry.reset();
  });

  test('returns a refresh function', async () => {
    let callCount = 0;
    const computedAtom = Atom.make(() => {
      callCount++;
      return callCount;
    });

    function TestComponent() {
      const value = useAtomValue(computedAtom);
      const refresh = useAtomRefresh(computedAtom);
      return (
        <div>
          <span data-testid='value'>{value()}</span>
          <button data-testid='refresh' onClick={refresh}>
            Refresh
          </button>
        </div>
      );
    }

    const { getByTestId } = render(() => <TestComponent />);
    expect(getByTestId('value').textContent).toBe('1');

    fireEvent.click(getByTestId('refresh'));

    await waitFor(() => {
      expect(getByTestId('value').textContent).toBe('2');
    });
  });
});
