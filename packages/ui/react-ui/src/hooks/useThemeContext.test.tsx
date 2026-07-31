//
// Copyright 2026 DXOS.org
//

import { renderHook } from '@testing-library/react';
import React, { type PropsWithChildren } from 'react';
import { describe, expect, test } from 'vitest';

import { ThemeProvider } from '../primitives';
import { defaultTx } from '../theme';
import { useThemeContext } from './useThemeContext';

describe('useThemeContext', () => {
  // Error-reporting surfaces (e.g. the fatal dialog) must be able to render even
  // when the provider is missing — including the vite dev dual-module case where
  // the provider supplied a different ThemeContext identity than the consumer's.
  test('falls back to the default theme without a provider', () => {
    const { result } = renderHook(() => useThemeContext());
    expect(result.current.tx).toBe(defaultTx);
    expect(result.current.themeMode).toBe('dark');
  });

  test('returns the provider value when present', () => {
    const wrapper = ({ children }: PropsWithChildren) => (
      <ThemeProvider tx={defaultTx} themeMode='light'>
        {children}
      </ThemeProvider>
    );
    const { result } = renderHook(() => useThemeContext(), { wrapper });
    expect(result.current.tx).toBe(defaultTx);
    expect(result.current.themeMode).toBe('light');
  });
});
