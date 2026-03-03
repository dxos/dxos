//
// Copyright 2025 DXOS.org
//

import * as Atom from '@effect-atom/atom/Atom';
import { render } from '@solidjs/testing-library';
import { beforeEach, describe, expect, test } from 'vitest';

import { defaultRegistry } from '../registry';

import { useAtomInitialValues } from './useAtomInitialValues';
import { useAtomValue } from './useAtomValue';

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
