//
// Copyright 2022 DXOS.org
//

import React, { type PropsWithChildren, createContext, useEffect, useMemo } from 'react';

import { trackKeyboardModality } from '@dxos/react-focus';
import { type Density, type Elevation, type ThemeFunction, type ThemeMode } from '@dxos/ui-types';

import { type SafeAreaPadding, useSafeArea } from '../../hooks';
import { hasIosKeyboard } from '../../util';
import { DensityProvider } from '../DensityProvider';
import { ElevationProvider } from '../ElevationProvider';
import { IconRegistryProvider } from './IconRegistry';
import { TranslationsProvider, type TranslationsProviderProps } from './TranslationsProvider';

export type ThemeContextValue = {
  tx: ThemeFunction<any>;
  themeMode: ThemeMode;
  hasIosKeyboard: boolean;
  safeAreaPadding?: SafeAreaPadding;
  platform?: 'mobile' | 'desktop';
};

/**
 * @internal
 */
export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export type ThemeProviderProps = Omit<TranslationsProviderProps, 'children'> &
  Partial<Omit<ThemeContextValue, 'safeAreaPadding'>> &
  PropsWithChildren<{
    rootDensity?: Density;
    rootElevation?: Elevation;
  }>;

export const ThemeProvider = ({
  children,
  fallback = null,
  resourceExtensions,
  appNs,
  tx = (_path, _styleProps, ..._options) => undefined,
  themeMode = 'dark',
  rootDensity = 'md',
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
          <ElevationProvider elevation='base'>
            <DensityProvider density={rootDensity}>{children}</DensityProvider>
          </ElevationProvider>
        </TranslationsProvider>
      </IconRegistryProvider>
    </ThemeContext.Provider>
  );
};
