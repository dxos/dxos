//
// Copyright 2025 DXOS.org
//

import * as Atom from '@effect-atom/atom/Atom';
import { fireEvent, render, waitFor } from '@solidjs/testing-library';
import { beforeEach, describe, expect, test } from 'vitest';

import { defaultRegistry } from '../registry';

import { useAtomValue } from './useAtomValue';

describe('useAtomValue', () => {
  beforeEach(() => {
    // Reset the default registry between tests
    defaultRegistry.reset();
  });

  test('reads initial atom value', () => {
    const countAtom = Atom.make(42);

    function TestComponent() {
      const count = useAtomValue(countAtom);
      return <div data-testid='count'>{count()}</div>;
    }

    const { getByTestId } = render(() => <TestComponent />);
    expect(getByTestId('count').textContent).toBe('42');
  });

  test('updates when atom value changes', async () => {
    const countAtom = Atom.make(0);

    function TestComponent() {
      const count = useAtomValue(countAtom);
      return (
        <div>
          <span data-testid='count'>{count()}</span>
          <button data-testid='increment' onClick={() => defaultRegistry.set(countAtom, count() + 1)}>
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
  });

  test('supports mapping function', () => {
    const countAtom = Atom.make(5);

    function TestComponent() {
      const doubled = useAtomValue(countAtom, (n) => n * 2);
      return <div data-testid='doubled'>{doubled()}</div>;
    }

    const { getByTestId } = render(() => <TestComponent />);
    expect(getByTestId('doubled').textContent).toBe('10');
  });
});
