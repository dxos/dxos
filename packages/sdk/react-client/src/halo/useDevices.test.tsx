//
// Copyright 2022 DXOS.org
//

import { renderHook } from '@testing-library/react';
import { expect } from 'chai';
import React from 'react';

import { Client } from '@dxos/client';
import { fromHost } from '@dxos/client-services';
import { describe, test } from '@dxos/test';

import { ClientContext } from '../client';
import { useDevices } from './useDevices';

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
