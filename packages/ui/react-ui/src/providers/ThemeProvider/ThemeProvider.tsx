//
// Copyright 2022 DXOS.org
//

import React, { type PropsWithChildren, createContext, useEffect, useMemo } from 'react';

import { trackKeyboardModality } from '@dxos/react-focus';
import { type ThemeFunction, type ThemeMode } from '@dxos/ui-types';

import { type SafeAreaPadding, useSafeArea } from '../../hooks/index.ts';
import { hasIosKeyboard } from '../../util/index.ts';
import { IconRegistryProvider } from './IconRegistry.tsx';
import { TranslationsProvider, type TranslationsProviderProps } from './TranslationsProvider.tsx';

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

export type ThemeProviderProps<P extends Record<string, any> = Record<string, any>> = Omit<
  TranslationsProviderProps,
  'children'
> &
  Partial<Omit<ThemeContextValue<P>, 'safeAreaPadding'>> &
  PropsWithChildren;

export const ThemeProvider = ({
  children,
  fallback = null,
  resourceExtensions,
  appNs,
  tx = (_path, _styleProps, ..._options) => undefined,
  themeMode = 'dark',
  platform,
}: ThemeProviderProps) => {
  useEffect(() => {
    return document.defaultView ? trackKeyboardModality(document.defaultView) : undefined;
  }, []);

  const safeAreaPadding = useSafeArea();
  // Destructure all props explicitly so useMemo deps are stable primitives, not a new `rest` object every render.
  const contextValue = useMemo(
    () => ({ tx, themeMode, hasIosKeyboard: hasIosKeyboard(), safeAreaPadding, platform }),
    [tx, themeMode, safeAreaPadding, platform],
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      <IconRegistryProvider>
        <TranslationsProvider
          {...{
            fallback,
            resourceExtensions,
            appNs,
          }}
        >
          {children}
        </TranslationsProvider>
      </IconRegistryProvider>
    </ThemeContext.Provider>
  );
};
