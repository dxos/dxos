//
// Copyright 2022 DXOS.org
//

import { act, renderHook } from '@testing-library/react';
import { describe, expect, test } from 'vitest';

import { Event, MulticastObservable } from '@dxos/async';

import { useMulticastObservable } from './useMulticastObservable';

describe('useMulticastObservable', () => {
  test('observes value', async () => {
    const event = new Event<number>();
    const observable = MulticastObservable.from(event, 0);
    const { result } = renderHook(() => useMulticastObservable(observable));
    expect(result.current).toEqual(0);
    act(() => event.emit(1));
    await expect.poll(() => result.current).toEqual(1);
  });
});
