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

import { defaultFocus } from '../../styles';
import { hasIosKeyboard, mx } from '../../util';
import { ElevationProvider } from '../ElevationProvider';
import { TranslationsProvider, TranslationsProviderProps } from './TranslationsProvider';

export type ThemeVariant = 'app' | 'os';

export interface ThemeContextValue {
  themeVariant: ThemeVariant;
  hasIosKeyboard?: boolean;
}

export type ThemeProviderProps = PropsWithChildren<{
  tooltipProviderProps?: TooltipProviderProps;
  toastProviderProps?: ToastProviderProps;
  toastViewportProps?: ToastViewportProps;
}> &
  Omit<TranslationsProviderProps, 'children'> &
  Partial<ThemeContextValue>;

export const ThemeContext = createContext<ThemeContextValue>({ themeVariant: 'app' });

export const ThemeProvider = ({
  children,
  tooltipProviderProps,
  toastProviderProps,
  toastViewportProps,
  fallback = null,
  resourceExtensions,
  appNs,
  themeVariant = 'app'
}: ThemeProviderProps) => {
  return (
    <ThemeContext.Provider value={{ themeVariant, hasIosKeyboard: hasIosKeyboard() }}>
      <TranslationsProvider
        {...{
          fallback,
          resourceExtensions,
          appNs
        }}
      >
        <ToastProvider {...toastProviderProps}>
          <TooltipProvider delayDuration={0} {...tooltipProviderProps}>
            <ElevationProvider elevation='base'>{children}</ElevationProvider>
          </TooltipProvider>
          <ToastViewport
            {...toastViewportProps}
            className={mx(
              'z-50 fixed bottom-4 inset-x-4 w-auto md:top-4 md:right-4 md:left-auto md:bottom-auto md:w-full md:max-w-sm rounded-lg flex flex-col gap-2',
              defaultFocus,
              toastViewportProps?.className
            )}
          />
        </ToastProvider>
      </TranslationsProvider>
    </ThemeContext.Provider>
  );
};
