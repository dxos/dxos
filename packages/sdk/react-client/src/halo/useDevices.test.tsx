//
// Copyright 2022 DXOS.org
//

import { renderHook } from '@testing-library/react';
import { expect } from 'chai';

import { describe, test } from '@dxos/test';

import { useDevices } from './useDevices';
import { createClient, createWrapper } from '../testing/util';

describe('useDevices', () => {
  test('lists existing devices', async () => {
    const { client } = await createClient({ createIdentity: true });
    const wrapper = await createWrapper(client);
    const { result } = renderHook(() => useDevices(), { wrapper });
    expect(result.current?.length).to.eq(1);
  });
});
