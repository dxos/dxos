//
// Copyright 2022 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import {
  ThemeProvider as AuroraThemeProvider,
  type ThemeProviderProps as AuroraThemeProviderProps,
  Toast,
  Tooltip,
  type TooltipProviderProps,
  type ToastProviderProps,
  type ToastViewportProps,
} from '@dxos/aurora';
import { auroraTx } from '@dxos/aurora-theme';

export type ThemeProviderProps = AuroraThemeProviderProps &
  PropsWithChildren<{
    themeVariant?: 'app' | 'os';
    tooltipProviderProps?: Omit<TooltipProviderProps, 'children'>;
    toastProviderProps?: Omit<ToastProviderProps, 'children'>;
    toastViewportProps?: Omit<ToastViewportProps, 'children'>;
  }>;

export const ThemeProvider = ({
  children,
  tooltipProviderProps,
  toastProviderProps,
  toastViewportProps,
  ...auroraThemeProviderProps
}: ThemeProviderProps) => {
  return (
    <AuroraThemeProvider tx={auroraTx} {...auroraThemeProviderProps}>
      <Toast.Provider {...toastProviderProps}>
        <Tooltip.Provider delayDuration={100} skipDelayDuration={400} {...tooltipProviderProps}>
          {children}
        </Tooltip.Provider>
        <Toast.Viewport {...toastViewportProps} classNames={toastViewportProps?.classNames} />
      </Toast.Provider>
    </AuroraThemeProvider>
  );
};
