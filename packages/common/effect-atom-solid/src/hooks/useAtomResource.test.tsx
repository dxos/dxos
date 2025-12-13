//
// Copyright 2025 DXOS.org
//

import * as Atom from '@effect-atom/atom/Atom';
import { render, waitFor } from '@solidjs/testing-library';
import * as Effect from 'effect/Effect';
import { beforeEach, describe, expect, test } from 'vitest';

import { defaultRegistry } from '../registry';

import { useAtomResource } from './useAtomResource';

describe('useAtomResource', () => {
  beforeEach(() => {
    // Reset the default registry between tests
    defaultRegistry.reset();
  });

  test('handles loading, success states for Result atoms', async () => {
    const dataAtom = Atom.make(Effect.succeed(42));

    function TestComponent() {
      const { value, loading, error } = useAtomResource(dataAtom);
      return (
        <div>
          <span data-testid='loading'>{loading() ? 'true' : 'false'}</span>
          <span data-testid='value'>{value() ?? 'none'}</span>
          <span data-testid='error'>{error() ? 'has error' : 'no error'}</span>
        </div>
      );
    }

    const { getByTestId } = render(() => <TestComponent />);

    // Wait for the effect to resolve
    await waitFor(() => {
      expect(getByTestId('value').textContent).toBe('42');
    });

    expect(getByTestId('error').textContent).toBe('no error');
  });
});
