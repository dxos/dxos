//
// Copyright 2022 DXOS.org
//

import { renderHook } from '@testing-library/react';
import { describe, expect, test } from 'vitest';

import { useDevices } from './useDevices';
import { createClient, createContextProvider } from '../testing/util';

describe('useDevices', () => {
  test('lists existing devices', async () => {
    const { client } = await createClient({ createIdentity: true });
    const wrapper = await createContextProvider(client);
    const { result } = renderHook(() => useDevices(), { wrapper });
    expect(result.current?.length).to.eq(1);
  });
});
