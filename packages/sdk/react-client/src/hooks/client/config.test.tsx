//
// Copyright 2020 DXOS.org
//

import { renderHook } from '@testing-library/react-hooks';
import React from 'react';

import { Client, ClientConfig } from '@dxos/client';

import { useConfig } from '.';
import { ClientProvider } from '../../containers';

describe('Config hook', () => {
  const render = () => useConfig();

  test('should throw when used outside a context', () => {
    const { result } = renderHook(render);
    expect(result.error?.message).toBeDefined();
  });

  test('should return default client config when no config is passed in a context', () => {
    const client = new Client({});
    const wrapper = ({ children }: any) => <ClientProvider client={client}>{children}</ClientProvider>;
    const { result } = renderHook(render, { wrapper });
    expect(result.error?.message).not.toBeDefined();
    expect(Object.entries(result.current).length).toBeGreaterThan(0);
  });

  test('should return custom client config when used properly in a context', () => {
    const config: ClientConfig = {
      storage: {
        persistent: false
      }
    };
    const client = new Client(config);
    const wrapper = ({ children }: any) => <ClientProvider client={client}>{children}</ClientProvider>;
    const { result } = renderHook(render, { wrapper });
    expect(result.error?.message).not.toBeDefined();
    expect(result.current.storage).toEqual(config.storage);
  });
});
