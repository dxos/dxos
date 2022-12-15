//
// Copyright 2022 DXOS.org
//

import { renderHook } from '@testing-library/react';
import { expect } from 'chai';
import React from 'react';

import { Client, fromHost } from '@dxos/client';
import { describe, test } from '@dxos/test';

import { ClientProvider } from '../client';
import { useDevices } from './useDevices';

describe('useDevices', () => {
  test('works', async () => {
    const client = new Client({ services: fromHost() });
    await client.initialize();
    await client.halo.createProfile();
    // TODO(wittjosiah): Factor out.
    const wrapper = ({ children }: any) => <ClientProvider client={client}>{children}</ClientProvider>;
    const { result } = renderHook(() => useDevices(), { wrapper });
    expect(result.current.devices?.length).to.eq(1);
  });
});
