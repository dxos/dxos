//
// Copyright 2020 DXOS.org
//

import { act, renderHook } from '@testing-library/react';
import expect from 'expect';

import { waitForCondition } from '@dxos/async';
import { Config, SystemStatus } from '@dxos/client';
import { describe, test } from '@dxos/test';

import { useConfig } from './useConfig';
import { createClient, createClientContextProvider } from '../testing/util';

describe('Config hook', () => {
  const render = () => useConfig();

  // TODO(wittjosiah): See client hook test.
  test.skip('should throw when used outside a context', () => {
    expect(renderHook(render)).toThrow();
  });

  test('should return default client config when no config is passed in a context', async () => {
    const { client } = await createClient();
    const wrapper = await createClientContextProvider(client);
    const { result } = renderHook(render, { wrapper });
    await act(async () => {
      await waitForCondition({ condition: () => client.status.get() === SystemStatus.ACTIVE });
    });
    expect(Object.entries(result.current).length).toBeGreaterThan(0);
  });

  test('should return custom client config when used properly in a context', async () => {
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
    expect(result.current.get('runtime.client.storage')).toEqual(config.get('runtime.client.storage'));
  });
});
