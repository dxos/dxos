//
// Copyright 2022 DXOS.org
//

import React, { ReactNode } from 'react';

import { UiProvider, UiProviderProps } from '@dxos/react-ui';

import { TranslationsProvider, TranslationsProviderProps } from '../../translations';

interface UiKitProviderProps extends Omit<UiProviderProps, 'children'>, Omit<TranslationsProviderProps, 'children'> {
  children?: ReactNode;
}

export const UiKitProvider = ({ children, fallback, resourceExtensions, ...uiProviderProps }: UiKitProviderProps) => {
  return (
    <UiProvider {...uiProviderProps}>
      <TranslationsProvider
        {...{
          fallback,
          resourceExtensions
        }}
      >
        {children}
      </TranslationsProvider>
    </UiProvider>
  );
};
