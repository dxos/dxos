//
// Copyright 2020 DXOS.org
//

import { renderHook } from '@testing-library/react-hooks';
import React from 'react';

import { Client } from '@dxos/client';
import { defs } from '@dxos/config';

import { useClient } from '.';
import { ClientProvider } from '../../containers';

describe('Client hook', () => {
  const render = () => useClient();

  test('should throw when used outside a context', () => {
    const { result } = renderHook(render);
    expect(result.error?.message).toBeDefined();
  });

  test('should return client when used properly in a context', () => {
    const config: defs.Config = {
      system: {
        storage: {
          persistent: false
        }
      },
    };
    const client = new Client(config);
    const wrapper = ({ children }: any) => <ClientProvider client={client}>{children}</ClientProvider>;
    const { result } = renderHook(render, { wrapper });
    expect(result.error?.message).not.toBeDefined();
    expect(result.current).toEqual(client);
  });
});
