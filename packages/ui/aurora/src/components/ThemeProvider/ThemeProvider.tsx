//
// Copyright 2022 DXOS.org
//

import {
  Provider as ToastProvider,
  ToastProviderProps,
  Viewport as ToastViewport,
  ToastViewportProps
} from '@radix-ui/react-toast';
import { Provider as TooltipProvider, TooltipProviderProps } from '@radix-ui/react-tooltip';
import React, { createContext, PropsWithChildren } from 'react';

import { Density, Elevation } from '../../props';
import { themeVariantFocus } from '../../styles';
import { hasIosKeyboard, mx } from '../../util';
import { DensityProvider } from '../DensityProvider';
import { ElevationProvider } from '../ElevationProvider';
import { TranslationsProvider, TranslationsProviderProps } from './TranslationsProvider';

export type ThemeVariant = 'app' | 'os';

export type ThemeMode = 'light' | 'dark';

export interface ThemeContextValue {
  themeVariant: ThemeVariant;
  // todo(thure): currently `themeMode` doesn’t do anything it’s just a place to persist the mode; determine how best to handle this given our Tailwind setup which selects tokens using the `dark` classname.
  themeMode?: ThemeMode;
  hasIosKeyboard?: boolean;
}

export type ThemeProviderProps = PropsWithChildren<{
  tooltipProviderProps?: Omit<TooltipProviderProps, 'children'>;
  toastProviderProps?: Omit<ToastProviderProps, 'children'>;
  toastViewportProps?: Omit<ToastViewportProps, 'children'>;
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
  tooltipProviderProps,
  toastProviderProps,
  toastViewportProps,
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
        <ToastProvider {...toastProviderProps}>
          <TooltipProvider delayDuration={100} skipDelayDuration={400} {...tooltipProviderProps}>
            <ElevationProvider elevation={rootElevation}>
              <DensityProvider density={rootDensity}>{children}</DensityProvider>
            </ElevationProvider>
          </TooltipProvider>
          <ToastViewport
            {...toastViewportProps}
            className={mx(
              'z-[70] fixed bottom-4 inset-x-4 w-auto md:top-4 md:right-4 md:left-auto md:bottom-auto md:w-full md:max-w-sm rounded-lg flex flex-col gap-2',
              themeVariantFocus(themeVariant),
              toastViewportProps?.className
            )}
          />
        </ToastProvider>
      </TranslationsProvider>
    </ThemeContext.Provider>
  );
};
