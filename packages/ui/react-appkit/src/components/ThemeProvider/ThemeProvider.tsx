//
// Copyright 2022 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import {
  ThemeProvider as UiThemeProvider,
  type ThemeProviderProps as UiThemeProviderProps,
  Toast,
  Tooltip,
  type TooltipProviderProps,
  type ToastProviderProps,
  type ToastViewportProps,
} from '@dxos/react-ui';
import { defaultTx } from '@dxos/react-ui-theme';

export type ThemeProviderProps = UiThemeProviderProps &
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
  ...uiThemeProviderProps
}: ThemeProviderProps) => {
  return (
    <UiThemeProvider tx={defaultTx} {...uiThemeProviderProps}>
      <Toast.Provider {...toastProviderProps}>
        <Tooltip.Provider delayDuration={100} skipDelayDuration={400} {...tooltipProviderProps}>
          {children}
        </Tooltip.Provider>
        <Toast.Viewport {...toastViewportProps} classNames={toastViewportProps?.classNames} />
      </Toast.Provider>
    </UiThemeProvider>
  );
};
