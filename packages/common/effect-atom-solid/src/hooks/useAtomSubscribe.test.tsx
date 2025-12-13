//
// Copyright 2025 DXOS.org
//

import * as Atom from '@effect-atom/atom/Atom';
import { fireEvent, render, waitFor } from '@solidjs/testing-library';
import { beforeEach, describe, expect, test } from 'vitest';

import { defaultRegistry } from '../registry';

import { useAtomSet } from './useAtomSet';
import { useAtomSubscribe } from './useAtomSubscribe';

describe('useAtomSubscribe', () => {
  beforeEach(() => {
    // Reset the default registry between tests
    defaultRegistry.reset();
  });

  test('calls callback on value changes', async () => {
    const countAtom = Atom.make(0);
    const values: number[] = [];

    function TestComponent() {
      useAtomSubscribe(
        countAtom,
        (value) => {
          values.push(value);
        },
        { immediate: true },
      );

      const setCount = useAtomSet(countAtom);
      return (
        <button data-testid='increment' onClick={() => setCount((c) => c + 1)}>
          +
        </button>
      );
    }

    const { getByTestId } = render(() => <TestComponent />);

    // Should have received the initial value
    expect(values).toContain(0);

    fireEvent.click(getByTestId('increment'));

    await waitFor(() => {
      expect(values).toContain(1);
    });
  });
});
