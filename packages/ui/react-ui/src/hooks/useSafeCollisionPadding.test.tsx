//
// Copyright 2026 DXOS.org
//

import { renderHook } from '@testing-library/react';
import React, { type PropsWithChildren } from 'react';
import { describe, expect, test } from 'vitest';

import { ThemeContext, type ThemeContextValue } from '../providers';
import { defaultTx } from '../theme';
import { initialSafeArea } from './useSafeArea';
import { useSafeCollisionPadding } from './useSafeCollisionPadding';

const wrap = (value: ThemeContextValue | undefined) =>
  function Wrapper({ children }: PropsWithChildren) {
    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
  };

const base: ThemeContextValue = { tx: defaultTx, themeMode: 'dark', hasIosKeyboard: false };

describe('useSafeCollisionPadding', () => {
  // A portalled surface under the dev server's dual-module split resolves the fallback context, which
  // carries no measured safe area; reading an inset off it used to throw and take out the popover.
  test('survives a context with no safe area', () => {
    const { result } = renderHook(() => useSafeCollisionPadding(8), { wrapper: wrap({ ...base }) });
    expect(result.current).to.deep.equal({ top: 8, right: 8, bottom: 8, left: 8 });
  });

  test('survives no provider at all', () => {
    const { result } = renderHook(() => useSafeCollisionPadding(8), { wrapper: wrap(undefined) });
    expect(result.current).to.deep.equal({ top: 8, right: 8, bottom: 8, left: 8 });
  });

  // Insets are NaN until the first viewport measurement, so they must read as zero rather than
  // poisoning the sum.
  test('treats unmeasured insets as zero', () => {
    const value = { ...base, safeAreaPadding: initialSafeArea };
    const { result } = renderHook(() => useSafeCollisionPadding(8), { wrapper: wrap(value) });
    expect(result.current).to.deep.equal({ top: 8, right: 8, bottom: 8, left: 8 });
  });

  test('adds measured insets to the requested padding', () => {
    const value = { ...base, safeAreaPadding: { top: 44, right: 0, bottom: 34, left: 0 } };
    const { result } = renderHook(() => useSafeCollisionPadding(8), { wrapper: wrap(value) });
    expect(result.current).to.deep.equal({ top: 52, right: 8, bottom: 42, left: 8 });
  });

  test('accepts a per-side padding record', () => {
    const value = { ...base, safeAreaPadding: { top: 44, right: 0, bottom: 0, left: 0 } };
    const { result } = renderHook(() => useSafeCollisionPadding({ top: 2, left: 6 }), { wrapper: wrap(value) });
    expect(result.current).to.deep.equal({ top: 46, right: 0, bottom: 0, left: 6 });
  });
});
