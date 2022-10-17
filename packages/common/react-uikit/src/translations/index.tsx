//
// Copyright 2022 DXOS.org
//

import i18Next from 'i18next';
import React, { PropsWithChildren, ReactNode, Suspense } from 'react';
import {
  initReactI18next,
  useTranslation as useNaturalTranslation
} from 'react-i18next';

import { Loading } from '@dxos/react-ui';

import * as enUS from './en-US';

export const useTranslation = useNaturalTranslation;

export const resources = {
  'en-US': enUS
} as const;

export const i18n = i18Next.use(initReactI18next).init({
  resources,
  lng: 'en-US',
  interpolation: {
    escapeValue: false
  }
});

export const TranslationsProvider = ({
  children,
  fallback = <Loading />
}: PropsWithChildren<{ fallback?: ReactNode }>) => {
  const { t: _t } = useNaturalTranslation();
  return <Suspense fallback={fallback}>{children}</Suspense>;
};
