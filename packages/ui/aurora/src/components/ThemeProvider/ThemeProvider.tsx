//
// Copyright 2022 DXOS.org
//

import React, { createContext, PropsWithChildren } from 'react';

import { Density, Elevation, ThemeVariant } from '@dxos/aurora-theme';

import { hasIosKeyboard } from '../../util';
import { DensityProvider } from '../DensityProvider';
import { ElevationProvider } from '../ElevationProvider';
import { TranslationsProvider, TranslationsProviderProps } from './TranslationsProvider';

export type ThemeMode = 'light' | 'dark';

export interface ThemeContextValue {
  themeVariant: ThemeVariant;
  // todo(thure): currently `themeMode` doesn’t do anything it’s just a place to persist the mode; determine how best to handle this given our Tailwind setup which selects tokens using the `dark` classname.
  themeMode?: ThemeMode;
  hasIosKeyboard?: boolean;
}

export type ThemeProviderProps = PropsWithChildren<{
  rootElevation?: Elevation;
  rootDensity?: Density;
}> &
  Omit<TranslationsProviderProps, 'children'> &
  Partial<ThemeContextValue>;

export const ThemeContext = createContext<ThemeContextValue>({
  themeVariant: 'app',
  themeMode: 'dark',
  hasIosKeyboard: false
});

export const ThemeProvider = ({
  children,
  fallback = null,
  resourceExtensions,
  appNs,
  themeVariant = 'app',
  themeMode = 'dark',
  rootElevation = 'base',
  rootDensity = 'coarse'
}: ThemeProviderProps) => {
  return (
    <ThemeContext.Provider value={{ themeVariant, themeMode, hasIosKeyboard: hasIosKeyboard() }}>
      <TranslationsProvider
        {...{
          fallback,
          resourceExtensions,
          appNs
        }}
      >
        <ElevationProvider elevation={rootElevation}>
          <DensityProvider density={rootDensity}>{children}</DensityProvider>
        </ElevationProvider>
      </TranslationsProvider>
    </ThemeContext.Provider>
  );
};
