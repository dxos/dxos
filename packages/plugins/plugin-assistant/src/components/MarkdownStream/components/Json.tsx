//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { useTranslation } from '@dxos/react-ui';
import { Json as NaturalJson } from '@dxos/react-ui-syntax-highlighter';

import { translationKey } from '../../../translations';
import { type XmlComponentProps } from '../extensions';

export type JsonProps = XmlComponentProps<{ data: string }>;

export const Json = ({ data }: JsonProps) => {
  const { t } = useTranslation(translationKey);
  try {
    const jsonData = JSON.parse(data);
    return <NaturalJson data={jsonData} />;
  } catch (_error) {
    return <p>{t('json error message')}</p>;
  }
};
