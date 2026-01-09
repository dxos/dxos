//
// Copyright 2025 DXOS.org
//

import { render } from '@solidjs/testing-library';
import * as Schema from 'effect/Schema';
import { describe, expect, test, vi } from 'vitest';

import { type PluginManager, PluginManagerContext, createResolver } from '@dxos/app-framework';
import { ContextProtocolProvider } from '@dxos/web-context-solid';

import { useIntentResolver } from './useIntentResolver';

class TestIntent extends Schema.TaggedClass<TestIntent>()('TestIntent', {
  input: Schema.Struct({
    value: Schema.String,
  }),
  output: Schema.Struct({
    result: Schema.String,
  }),
}) {}

describe('useIntentResolver', () => {
  test('registers and unregisters intent resolver', () => {
    const contributeMock = vi.fn();
    const removeMock = vi.fn();

    const mockManager = {
      context: {
        contributeCapability: contributeMock,
        removeCapability: removeMock,
      },
    } as unknown as PluginManager.PluginManager;

    const resolver = createResolver({
      intent: TestIntent,
      resolve: async (data) => ({ data: { result: data.value } }),
    });

    const TestComponent = () => {
      useIntentResolver('test-module', resolver);
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
        implementation: resolver,
      }),
    );

    unmount();

    expect(removeMock).toHaveBeenCalled();
  });
});
