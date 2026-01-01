//
// Copyright 2025 DXOS.org
//

import { render } from '@solidjs/testing-library';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { describe, expect, test, vi } from 'vitest';

import { OperationResolver, type PluginManager, PluginManagerContext } from '@dxos/app-framework';
import * as Operation from '@dxos/operation';
import { ContextProtocolProvider } from '@dxos/web-context-solid';

import { useOperationResolver } from './useOperationResolver';

const TestOperation = Operation.make({
  meta: { key: 'test/operation', name: 'Test Operation' },
  schema: {
    input: Schema.Struct({ value: Schema.String }),
    output: Schema.Struct({ result: Schema.String }),
  },
});

describe('useOperationResolver', () => {
  test('registers and unregisters operation resolver', () => {
    const contributeMock = vi.fn();
    const removeMock = vi.fn();

    const mockManager = {
      context: {
        contributeCapability: contributeMock,
        removeCapability: removeMock,
      },
    } as unknown as PluginManager.PluginManager;

    const resolver = OperationResolver.make({
      operation: TestOperation,
      handler: ({ value }) => Effect.succeed({ result: value }),
    });

    const TestComponent = () => {
      useOperationResolver('test-module', resolver);
      return <div />;
    };

    const { unmount } = render(() => (
      <ContextProtocolProvider context={PluginManagerContext} value={mockManager}>
        <TestComponent />
      </ContextProtocolProvider>
    ));

    expect(contributeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        module: 'test-module',
        implementation: [resolver],
      }),
    );

    unmount();

    expect(removeMock).toHaveBeenCalled();
  });
});
