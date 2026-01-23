//
// Copyright 2025 DXOS.org
//

import * as Atom from '@effect-atom/atom/Atom';
import { fireEvent, render, waitFor } from '@solidjs/testing-library';
import { beforeEach, describe, expect, test } from 'vitest';

import { defaultRegistry } from '../registry';

import { useAtomSet } from './useAtomSet';
import { useAtomValue } from './useAtomValue';

describe('useAtomSet', () => {
  beforeEach(() => {
    // Reset the default registry between tests
    defaultRegistry.reset();
  });

  test('returns a setter function', async () => {
    const countAtom = Atom.make(0);

    function TestComponent() {
      const setCount = useAtomSet(countAtom);
      const count = useAtomValue(countAtom);
      return (
        <div>
          <span data-testid='count'>{count()}</span>
          <button data-testid='set' onClick={() => setCount(10)}>
            Set to 10
          </button>
        </div>
      );
    }

    const { getByTestId } = render(() => <TestComponent />);
    expect(getByTestId('count').textContent).toBe('0');

    fireEvent.click(getByTestId('set'));

    await waitFor(() => {
      expect(getByTestId('count').textContent).toBe('10');
    });
  });

  test('supports updater function', async () => {
    const countAtom = Atom.make(5);

    function TestComponent() {
      const setCount = useAtomSet(countAtom);
      const count = useAtomValue(countAtom);
      return (
        <div>
          <span data-testid='count'>{count()}</span>
          <button data-testid='double' onClick={() => setCount((c) => c * 2)}>
            Double
          </button>
        </div>
      );
    }

    const { getByTestId } = render(() => <TestComponent />);
    expect(getByTestId('count').textContent).toBe('5');

    fireEvent.click(getByTestId('double'));

    await waitFor(() => {
      expect(getByTestId('count').textContent).toBe('10');
    });
  });
});
