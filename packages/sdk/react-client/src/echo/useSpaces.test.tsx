//
// Copyright 2022 DXOS.org
//

import { act, renderHook } from '@testing-library/react';
import { expect } from 'chai';
import React from 'react';

import { Client, fromHost } from '@dxos/client';
import { describe, test } from '@dxos/test';

import { useSpace, useSpaces } from './useSpaces';
import { ClientContext } from '../client';

describe('useSpaces', () => {
  test('lists existing spaces', async () => {
    const client = new Client({ services: fromHost() });
    await client.initialize();
    await client.halo.createIdentity();
    await client.spaces.isReady.wait();
    // TODO(wittjosiah): Factor out.
    const wrapper = ({ children }: any) => (
      <ClientContext.Provider value={{ client }}>{children}</ClientContext.Provider>
    );
    const { result } = renderHook(() => useSpaces(), { wrapper });
    expect(result.current.length).to.eq(1);
  });

  test('updates when new spaces are created', async () => {
    const client = new Client({ services: fromHost() });
    await client.initialize();
    await client.halo.createIdentity();
    await client.spaces.isReady.wait();
    // TODO(wittjosiah): Factor out.
    const wrapper = ({ children }: any) => (
      <ClientContext.Provider value={{ client }}>{children}</ClientContext.Provider>
    );
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
    const client = new Client({ services: fromHost() });
    await client.initialize();
    // TODO(wittjosiah): Factor out.
    const wrapper = ({ children }: any) => (
      <ClientContext.Provider value={{ client }}>{children}</ClientContext.Provider>
    );
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
    const client = new Client({ services: fromHost() });
    await client.initialize();
    await client.halo.createIdentity();
    const space = await client.spaces.create();
    // TODO(wittjosiah): Factor out.
    const wrapper = ({ children }: any) => (
      <ClientContext.Provider value={{ client }}>{children}</ClientContext.Provider>
    );
    const { result } = renderHook(() => useSpace(space.key), { wrapper });
    expect(result.current).to.not.be.undefined;
  });
});
