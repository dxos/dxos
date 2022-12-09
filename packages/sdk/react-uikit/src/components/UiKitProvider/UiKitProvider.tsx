//
// Copyright 2022 DXOS.org
//

import type { Resource as ResourceType } from 'i18next';
import React, { ReactNode } from 'react';

import { UiProvider, UiProviderProps } from '@dxos/react-ui';

import { TranslationsProvider, TranslationsProviderProps } from '../../translations';

export type Resource = ResourceType;

export interface UiKitProviderProps
  extends Omit<UiProviderProps, 'children'>,
    Omit<TranslationsProviderProps, 'children'> {
  children?: ReactNode;
}

export const UiKitProvider = ({
  children,
  fallback,
  resourceExtensions,
  appNs,
  ...uiProviderProps
}: UiKitProviderProps) => {
  return (
    <UiProvider {...uiProviderProps}>
      <TranslationsProvider
        {...{
          fallback,
          resourceExtensions,
          appNs
        }}
      >
        {children}
      </TranslationsProvider>
    </UiProvider>
  );
};
