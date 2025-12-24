//
// Copyright 2022 DXOS.org
//

import { createKeyborg } from 'keyborg';
import React, { type PropsWithChildren, createContext, useEffect, useMemo } from 'react';

import { type Density, type Elevation, type ThemeFunction, type ThemeMode } from '@dxos/ui-types';

import { type SafeAreaPadding, useSafeArea } from '../../hooks';
import { hasIosKeyboard } from '../../util';
import { DensityProvider } from '../DensityProvider';
import { ElevationProvider } from '../ElevationProvider';

import { TranslationsProvider, type TranslationsProviderProps } from './TranslationsProvider';

export type ThemeContextValue = {
  tx: ThemeFunction<any>;
  themeMode: ThemeMode;
  hasIosKeyboard: boolean;
  safeAreaPadding?: SafeAreaPadding;
  noCache?: boolean;
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
  tx = (_path, defaultClassName, _styleProps, ..._options) => defaultClassName,
  themeMode = 'dark',
  rootDensity = 'fine',
  ...rest
}: ThemeProviderProps) => {
  useEffect(() => {
    if (document.defaultView) {
      const kb = createKeyborg(document.defaultView);
      kb.subscribe(handleInputModalityChange);
      return () => kb.unsubscribe(handleInputModalityChange);
    }
  }, []);

  const safeAreaPadding = useSafeArea();
  const contextValue = useMemo(
    () => ({ tx, themeMode, hasIosKeyboard: hasIosKeyboard(), safeAreaPadding, ...rest }),
    [tx, themeMode, safeAreaPadding, rest],
  );

  return (
    <ThemeContext.Provider value={contextValue}>
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
    </ThemeContext.Provider>
  );
};

const handleInputModalityChange = (isUsingKeyboard: boolean) => {
  if (isUsingKeyboard) {
    document.body.setAttribute('data-is-keyboard', 'true');
  } else {
    document.body.removeAttribute('data-is-keyboard');
  }
};
