//
// Copyright 2025 DXOS.org
//

import { render } from '@solidjs/testing-library';
import * as Atom from 'effect/unstable/reactivity/Atom';
import { beforeEach, describe, expect, test } from 'vitest';

import { defaultRegistry } from '../registry.ts';
import { useAtomInitialValues } from './useAtomInitialValues.ts';
import { useAtomValue } from './useAtomValue.ts';

describe('useAtomInitialValues', () => {
  beforeEach(() => {
    defaultRegistry.reset();
  });

  test('initializes atoms', () => {
    const atom = Atom.make(0);

    function TestComponent() {
      useAtomInitialValues([[atom, 42]]);
      const value = useAtomValue(atom);
      return <span data-testid='val'>{value()}</span>;
    }

    const { getByTestId } = render(() => <TestComponent />);
    expect(getByTestId('val').textContent).toBe('42');
  });
});
