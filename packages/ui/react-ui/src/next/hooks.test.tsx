//
// Copyright 2026 DXOS.org
//

import { renderHook } from '@testing-library/react';
import React, { type PropsWithChildren } from 'react';
import { describe, expect, test } from 'vitest';

import { ThemeProvider } from '../providers/index.ts';
import { defaultTx } from '../theme/index.ts';
import { useIosKeyboard, usePlatform, useThemeMode } from './hooks.ts';

const useValues = () => ({ themeMode: useThemeMode(), platform: usePlatform(), iosKeyboard: useIosKeyboard() });

describe('Next theme hooks', () => {
  test('read the ThemeProvider values', () => {
    const wrapper = ({ children }: PropsWithChildren) => (
      <ThemeProvider tx={defaultTx} themeMode='light' platform='mobile'>
        {children}
      </ThemeProvider>
    );
    const { result } = renderHook(useValues, { wrapper });
    expect(result.current).toEqual({ themeMode: 'light', platform: 'mobile', iosKeyboard: false });
  });

  test('fall back without a provider', () => {
    const { result } = renderHook(useValues);
    expect(result.current).toEqual({ themeMode: 'dark', platform: undefined, iosKeyboard: false });
  });
});
