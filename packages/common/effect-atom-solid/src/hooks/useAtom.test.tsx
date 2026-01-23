//
// Copyright 2025 DXOS.org
//

import * as Atom from '@effect-atom/atom/Atom';
import { fireEvent, render, waitFor } from '@solidjs/testing-library';
import { beforeEach, describe, expect, test } from 'vitest';

import { defaultRegistry } from '../registry';

import { useAtom } from './useAtom';

describe('useAtom', () => {
  beforeEach(() => {
    // Reset the default registry between tests
    defaultRegistry.reset();
  });

  test('returns both value and setter', async () => {
    const countAtom = Atom.make(0);

    function TestComponent() {
      const [count, setCount] = useAtom(countAtom);
      return (
        <div>
          <span data-testid='count'>{count()}</span>
          <button data-testid='increment' onClick={() => setCount((c) => c + 1)}>
            +
          </button>
        </div>
      );
    }

    const { getByTestId } = render(() => <TestComponent />);
    expect(getByTestId('count').textContent).toBe('0');

    fireEvent.click(getByTestId('increment'));

    await waitFor(() => {
      expect(getByTestId('count').textContent).toBe('1');
    });

    fireEvent.click(getByTestId('increment'));

    await waitFor(() => {
      expect(getByTestId('count').textContent).toBe('2');
    });
  });
});
