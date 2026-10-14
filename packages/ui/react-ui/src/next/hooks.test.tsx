//
// Copyright 2026 DXOS.org
//

import { renderHook } from '@testing-library/react';
import React, { type PropsWithChildren } from 'react';
import { describe, expect, test } from 'vitest';

import * as Theme from '../providers/ThemeProvider/Theme.tsx';
import { defaultTx } from '../theme/defaultTheme.ts';
import { useIosKeyboard, usePlatform, useThemeMode } from './hooks.ts';

const useValues = () => ({ themeMode: useThemeMode(), platform: usePlatform(), iosKeyboard: useIosKeyboard() });

describe('Next theme hooks', () => {
  test('read the ThemeProvider values', () => {
    const wrapper = ({ children }: PropsWithChildren) => (
      <Theme.Provider tx={defaultTx} themeMode='light' platform='mobile'>
        {children}
      </Theme.Provider>
    );
    const { result } = renderHook(useValues, { wrapper });
    expect(result.current).toEqual({ themeMode: 'light', platform: 'mobile', iosKeyboard: false });
  });

  test('fall back without a provider', () => {
    const { result } = renderHook(useValues);
    expect(result.current).toEqual({ themeMode: 'dark', platform: undefined, iosKeyboard: false });
  });
});
