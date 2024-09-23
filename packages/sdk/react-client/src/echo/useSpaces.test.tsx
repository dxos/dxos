//
// Copyright 2022 DXOS.org
//

import { act, renderHook } from '@testing-library/react';
import { expect } from 'chai';

import { describe, test } from '@dxos/test';

import { useSpace, useSpaces } from './useSpaces';
import { createClient, createWrapper } from '../testing/util';

describe('useSpaces', () => {
  test('lists existing spaces', async () => {
    const { client } = await createClient({ createIdentity: true });
    const wrapper = await createWrapper(client);
    const { result } = renderHook(() => useSpaces(), { wrapper });
    expect(result.current.length).to.eq(1);
  });

  test('updates when new spaces are created', async () => {
    const { client } = await createClient({ createIdentity: true });
    const wrapper = await createWrapper(client);
    const { result, rerender } = renderHook(() => useSpaces(), { wrapper });
    expect(result.current.length).to.eq(1);
    await act(async () => {
      await client.spaces.create();
    });
    rerender();
    expect(result.current.length).to.eq(2);
  });
});

describe('useSpace', () => {
  test('gets default space', async () => {
    const { client } = await createClient();
    const wrapper = await createWrapper(client);
    const { result, rerender } = renderHook(() => useSpace(), { wrapper });
    expect(result.current).to.be.undefined;
    await act(async () => {
      await client.halo.createIdentity();
      await client.spaces.isReady.wait();
    });
    rerender();
    expect(result.current).to.not.be.undefined;
  });

  test('gets space by key', async () => {
    const { client, space } = await createClient({ createIdentity: true, createSpace: true });
    const wrapper = await createWrapper(client);
    const { result } = renderHook(() => useSpace(space!.key), { wrapper });
    expect(result.current).to.not.be.undefined;
  });
});
