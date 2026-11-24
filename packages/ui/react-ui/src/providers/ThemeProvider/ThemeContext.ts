//
// Copyright 2022 DXOS.org
//

import { createContext } from 'react';

import { type ThemeFunction, type ThemeMode } from '@dxos/ui-types';

import { type SafeAreaPadding } from '../../hooks/useSafeArea.ts';

export type ThemeContextValue<P extends Record<string, any> = Record<string, any>> = {
  tx: ThemeFunction<P>;
  themeMode: ThemeMode;
  hasIosKeyboard: boolean;
  safeAreaPadding?: SafeAreaPadding;
  platform?: 'mobile' | 'desktop';
};

/**
 * @internal
 */
export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
