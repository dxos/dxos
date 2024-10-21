//
// Copyright 2022 DXOS.org
//

import { createKeyborg } from 'keyborg';
import React, { createContext, type PropsWithChildren, useEffect, useState } from 'react';

import { type Density, type Elevation, type ThemeFunction } from '@dxos/react-ui-types';

import { TranslationsProvider, type TranslationsProviderProps } from './TranslationsProvider';
import { hasIosKeyboard } from '../../util';
import { DensityProvider } from '../DensityProvider';
import { ElevationProvider } from '../ElevationProvider';

export type ThemeMode = 'light' | 'dark';

export type ThemeContextValue = {
  id: string;
  tx: ThemeFunction<any>;
  themeMode: ThemeMode;
  hasIosKeyboard: boolean;
};

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export type ThemeProviderProps = Omit<TranslationsProviderProps, 'children'> &
  Partial<ThemeContextValue> &
  PropsWithChildren<{
    rootElevation?: Elevation;
    rootDensity?: Density;
  }>;

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
  const [id] = useState(() => Math.random().toString(36).substring(2, 15));
  useEffect(() => {
    if (document.defaultView) {
      const kb = createKeyborg(document.defaultView);
      kb.subscribe(handleInputModalityChange);
      return () => kb.unsubscribe(handleInputModalityChange);
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ id, tx, themeMode, hasIosKeyboard: hasIosKeyboard() }}>
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

const handleInputModalityChange = (isUsingKeyboard: boolean) => {
  if (isUsingKeyboard) {
    document.body.setAttribute('data-is-keyboard', 'true');
  } else {
    document.body.removeAttribute('data-is-keyboard');
  }
};
