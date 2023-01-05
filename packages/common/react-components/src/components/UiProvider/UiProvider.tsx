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
import React, { PropsWithChildren } from 'react';

import { defaultFocus } from '../../styles';
import { mx } from '../../util';
import { TranslationsProvider, TranslationsProviderProps } from './TranslationsProvider';

export type UiProviderProps = PropsWithChildren<{
  tooltipProviderProps?: TooltipProviderProps;
  toastProviderProps?: ToastProviderProps;
  toastViewportProps?: ToastViewportProps;
}> &
  Omit<TranslationsProviderProps, 'children'>;

export const UiProvider = ({
  children,
  tooltipProviderProps,
  toastProviderProps,
  toastViewportProps,
  fallback,
  resourceExtensions,
  appNs
}: UiProviderProps) => {
  return (
    <TranslationsProvider
      {...{
        fallback,
        resourceExtensions,
        appNs
      }}
    >
      <ToastProvider {...toastProviderProps}>
        <TooltipProvider delayDuration={0} {...tooltipProviderProps}>
          {children}
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
  );
};
