//
// Copyright 2025 DXOS.org
//

import * as Atom from '@effect-atom/atom/Atom';
import { render, screen } from '@solidjs/testing-library';
import { describe, expect, test } from 'vitest';

import { type PluginManager, PluginManagerContext, defineCapability } from '@dxos/app-framework';
import { ContextProtocolProvider } from '@dxos/web-context-solid';

import { useCapabilities, useCapability } from './useCapabilities';

const TestCapability = defineCapability<{ value: string }>('test.capability');

const mockAtom = Atom.make([{ value: 'hello' }]);

const mockManager = {
  context: {
    capabilities: () => mockAtom,
  },
} as unknown as PluginManager;

describe('useCapabilities', () => {
  test('returns capabilities from the plugin manager', () => {
    const TestComponent = () => {
      const caps = useCapabilities(TestCapability);
      return <div data-testid='caps-length'>{caps().length}</div>;
    };

    render(() => (
      <ContextProtocolProvider context={PluginManagerContext} value={mockManager}>
        <TestComponent />
      </ContextProtocolProvider>
    ));

    expect(screen.getByTestId('caps-length').textContent).toBe('1');
  });
});

describe('useCapability', () => {
  test('returns a single capability', () => {
    const TestComponent = () => {
      const cap = useCapability(TestCapability);
      return <div data-testid='cap-value'>{cap().value}</div>;
    };

    render(() => (
      <ContextProtocolProvider context={PluginManagerContext} value={mockManager}>
        <TestComponent />
      </ContextProtocolProvider>
    ));

    expect(screen.getByTestId('cap-value').textContent).toBe('hello');
  });

  test('throws if no capability is found', () => {
    const emptyAtom = Atom.make([]);
    const emptyManager = {
      context: {
        capabilities: () => emptyAtom,
      },
    } as unknown as PluginManager;

    const TestComponent = () => {
      const cap = useCapability(TestCapability);
      return <div>{cap().value}</div>; // This read triggers the invariant
    };

    expect(() =>
      render(() => (
        <ContextProtocolProvider context={PluginManagerContext} value={emptyManager}>
          <TestComponent />
        </ContextProtocolProvider>
      )),
    ).toThrow(/No capability found/);
  });
});
