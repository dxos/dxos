//
// Copyright 2022 DXOS.org
//

import { renderHook } from '@testing-library/react';
import React from 'react';
import { describe, expect, test } from 'vitest';

import { Client, fromHost } from '@dxos/client';

import { useDevices } from './useDevices';
import { ClientContext } from '../client';

describe('useDevices', () => {
  test('lists existing devices', async () => {
    const client = new Client({ services: fromHost() });
    await client.initialize();
    await client.halo.createIdentity();
    // TODO(wittjosiah): Factor out.
    const wrapper = ({ children }: any) => (
      <ClientContext.Provider value={{ client }}>{children}</ClientContext.Provider>
    );
    const { result } = renderHook(() => useDevices(), { wrapper });
    expect(result.current?.length).to.eq(1);
  });
});
