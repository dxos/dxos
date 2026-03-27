//
// Copyright 2025 DXOS.org
//

import { render } from '@solidjs/testing-library';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { describe, expect, test, vi } from 'vitest';

import { type PluginManager, PluginManagerContext } from '@dxos/app-framework';
import { Operation } from '@dxos/operation';
import { ContextProtocolProvider } from '@dxos/web-context-solid';

import { useOperationResolver } from './useOperationResolver';

const TestOperation = Operation.make({
  meta: { key: 'test/operation', name: 'Test Operation' },
  input: Schema.Struct({ value: Schema.String }),
  output: Schema.Struct({ result: Schema.String }),
});

describe('useOperationResolver', () => {
  test('registers and unregisters operation handler', () => {
    const contributeMock = vi.fn();
    const removeMock = vi.fn();

    const mockManager = {
      capabilities: {
        contribute: contributeMock,
        remove: removeMock,
      },
    } as unknown as PluginManager.PluginManager;

    const handler = Operation.withHandler(TestOperation, ({ value }) => Effect.succeed({ result: value }));

    const TestComponent = () => {
      useOperationResolver('test-module', handler);
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
      }),
    );

    unmount();

    expect(removeMock).toHaveBeenCalled();
  });
});
