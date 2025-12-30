//
// Copyright 2025 DXOS.org
//

import { render, screen } from '@solidjs/testing-library';
import { describe, expect, test } from 'vitest';

import { type PluginManager, PluginManagerContext } from '@dxos/app-framework';
import { ContextProtocolProvider } from '@dxos/web-context-solid';

import { usePluginManager } from './usePluginManager';

describe('usePluginManager', () => {
  test('returns the plugin manager from context', () => {
    const mockManager = {
      context: {
        capabilities: () => ({ pipe: () => {} }),
      },
    } as unknown as PluginManager.PluginManager;

    const TestComponent = () => {
      const manager = usePluginManager();
      return <div data-testid='manager-check'>{manager === mockManager ? 'match' : 'mismatch'}</div>;
    };

    render(() => (
      <ContextProtocolProvider context={PluginManagerContext} value={mockManager}>
        <TestComponent />
      </ContextProtocolProvider>
    ));

    expect(screen.getByTestId('manager-check').textContent).toBe('match');
  });

  test('throws if plugin manager is missing', () => {
    const TestComponent = () => {
      // @ts-ignore
      usePluginManager(); // This should throw
      return <div />;
    };

    // Use a custom error boundary or just try/catch mechanism if simple render throws.
    // However, Solid's reactivity system might make catching errors tricky during render phase directly in test if not handled.
    // Given the invariant check is inside the hook, it executes during component initialization.

    expect(() => render(() => <TestComponent />)).toThrow('PluginManager not found');
  });
});
