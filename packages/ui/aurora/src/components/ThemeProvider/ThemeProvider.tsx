//
// Copyright 2022 DXOS.org
//

import { createKeyborg } from 'keyborg';
import React, { createContext, PropsWithChildren, useEffect } from 'react';

import { Density, Elevation, ThemeFunction } from '@dxos/aurora-types';

import { TranslationsProvider, TranslationsProviderProps } from './TranslationsProvider';
import { hasIosKeyboard } from '../../util';
import { DensityProvider } from '../DensityProvider';
import { ElevationProvider } from '../ElevationProvider';

export type ThemeMode = 'light' | 'dark';

export interface ThemeContextValue {
  tx: ThemeFunction<any>;
  themeMode: ThemeMode;
  hasIosKeyboard: boolean;
}

export type ThemeProviderProps = Omit<TranslationsProviderProps, 'children'> &
  Partial<ThemeContextValue> &
  PropsWithChildren<{
    rootElevation?: Elevation;
    rootDensity?: Density;
  }>;

export const ThemeContext = createContext<ThemeContextValue>({
  tx: (_path, defaultClassName, _styleProps, ..._options) => defaultClassName,
  themeMode: 'dark',
  hasIosKeyboard: false,
});

const handleInputModalityChange = (isUsingKeyboard: boolean) => {
  if (isUsingKeyboard) {
    document.body.setAttribute('data-is-keyboard', 'true');
  } else {
    document.body.removeAttribute('data-is-keyboard');
  }
};

export const ThemeProvider = ({
  children,
  fallback = null,
  resourceExtensions,
  appNs,
  tx = (_path, defaultClassName, _styleProps, ..._options) => defaultClassName,
  themeMode = 'dark',
  rootElevation = 'base',
  rootDensity = 'coarse',
}: ThemeProviderProps) => {
  useEffect(() => {
    if (document.defaultView) {
      const kb = createKeyborg(document.defaultView);
      kb.subscribe(handleInputModalityChange);
      return () => kb.unsubscribe(handleInputModalityChange);
    }
  }, []);
  return (
    <ThemeContext.Provider value={{ tx, themeMode, hasIosKeyboard: hasIosKeyboard() }}>
      <TranslationsProvider
        {...{
          fallback,
          resourceExtensions,
          appNs,
        }}
      >
        <ElevationProvider elevation={rootElevation}>
          <DensityProvider density={rootDensity}>{children}</DensityProvider>
        </ElevationProvider>
      </TranslationsProvider>
    </ThemeContext.Provider>
  );
};
