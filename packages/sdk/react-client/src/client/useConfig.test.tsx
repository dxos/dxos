//
// Copyright 2020 DXOS.org
//

import { act, renderHook } from '@testing-library/react';
import { describe, expect, test } from 'vitest';

import { waitForCondition } from '@dxos/async';
import { Config, SystemStatus } from '@dxos/client';

import { useConfig } from './useConfig';
import { createClient, createClientContextProvider } from '../testing/util';

// TODO(burdon): Disabled in CI since flaky.
describe.runIf(!process.env.CI)('Config hook', () => {
  const render = () => useConfig();

  // TODO(wittjosiah): See client hook test.
  test.skip('should throw when used outside a context', () => {
    expect(renderHook(render)).toThrow();
  });

  test('should return default client config', async () => {
    const { client } = await createClient();
    const wrapper = await createClientContextProvider(client);
    const { result } = renderHook(render, { wrapper });
    await act(async () => {
      await waitForCondition({ condition: () => client.status.get() === SystemStatus.ACTIVE });
    });
    expect(Object.entries(result.current).length).toBeGreaterThan(0);
  });

  test('should return custom client config', async () => {
    const config = new Config({
      version: 1,
      runtime: {
        client: {
          storage: {
            persistent: false,
          },
        },
      },
    });

    const { client } = await createClient({ config });
    const wrapper = await createClientContextProvider(client);
    const { result } = renderHook(render, { wrapper });
    await act(async () => {
      await waitForCondition({ condition: () => client.status.get() === SystemStatus.ACTIVE });
    });
    expect(Object.entries(result.current).length).toBeGreaterThan(0);
    expect(result.current.get('runtime.client.storage')).toEqual(config.get('runtime.client.storage'));
  });
});
