//
// Copyright 2022 DXOS.org
//

import i18Next from 'i18next';
import React, { PropsWithChildren, ReactNode, Suspense } from 'react';
import { initReactI18next, useTranslation } from 'react-i18next';

import { UntranslatedLoading } from '../components';
import * as enUS from './locales/en-US';

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
  fallback
}: PropsWithChildren<{ fallback?: ReactNode }>) => {
  const { t: _t } = useTranslation();
  return (
    <Suspense
      fallback={fallback ??
        <UntranslatedLoading label={enUS.translation['loading translations']} />}
    >
      {children}
    </Suspense>
  );
};
