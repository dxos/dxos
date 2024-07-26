//
// Copyright 2020 DXOS.org
//

import { act, renderHook } from '@testing-library/react';
import expect from 'expect';
import React from 'react';

import { waitForCondition } from '@dxos/async';
import { Client, Config, SystemStatus, fromHost } from '@dxos/client';
import { describe, test } from '@dxos/test';

import { ClientProvider } from './ClientContext';
import { useConfig } from './useConfig';

describe('Config hook', () => {
  const render = () => useConfig();

  // TODO(wittjosiah): See client hook test.
  test.skip('should throw when used outside a context', () => {
    expect(renderHook(render)).toThrow();
  });

  test('should return default client config when no config is passed in a context', async () => {
    const client = new Client({ services: fromHost() });
    await client.initialize();
    const wrapper = ({ children }: any) => <ClientProvider client={client}>{children}</ClientProvider>;
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
    const client = new Client({ config, services: fromHost(config) });
    await client.initialize();
    const wrapper = ({ children }: any) => <ClientProvider client={client}>{children}</ClientProvider>;
    const { result } = renderHook(render, { wrapper });
    await act(async () => {
      await waitForCondition({ condition: () => client.status.get() === SystemStatus.ACTIVE });
    });
    expect(result.current.get('runtime.client.storage')).toEqual(config.get('runtime.client.storage'));
  });
});
