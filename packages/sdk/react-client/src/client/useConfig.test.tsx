//
// Copyright 2020 DXOS.org
//

import { renderHook } from '@testing-library/react';
import expect from 'expect';
import React from 'react';

import { Client, Config, fromHost } from '@dxos/client';

import { ClientProvider } from './ClientContext';
import { useConfig } from './useConfig';

describe('Config hook', function () {
  const render = () => useConfig();

  // TODO(wittjosiah): See client hook test.
  it.skip('should throw when used outside a context', function () {
    expect(renderHook(render)).toThrow();
  });

  it('should return default client config when no config is passed in a context', function () {
    const client = new Client({ services: fromHost() });
    const wrapper = ({ children }: any) => <ClientProvider client={client}>{children}</ClientProvider>;
    const { result } = renderHook(render, { wrapper });
    expect(Object.entries(result.current).length).toBeGreaterThan(0);
  });

  it('should return custom client config when used properly in a context', function () {
    const config = new Config({
      version: 1,
      runtime: {
        client: {
          storage: {
            persistent: false
          }
        }
      }
    });
    const client = new Client({ config, services: fromHost(config) });
    const wrapper = ({ children }: any) => <ClientProvider client={client}>{children}</ClientProvider>;
    const { result } = renderHook(render, { wrapper });
    expect(result.current.get('runtime.client.storage')).toEqual(config.get('runtime.client.storage'));
  });
});
