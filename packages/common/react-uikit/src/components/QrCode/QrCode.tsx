//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { useTranslation } from 'react-i18next';

import {
  QrCode as UntranslatedQrCode,
  QrCodeProps as UntranslatedQrCodeProps
} from '@dxos/react-ui';

import { TKey } from '../../types';

export interface QrCodeProps extends Omit<UntranslatedQrCodeProps, 'translatedCopyLabel'> {
  labelTKey: TKey
}

export const QrCode = ({ labelTKey, ...props }: QrCodeProps) => {
  const { t } = useTranslation();
  return (
    <UntranslatedQrCode
      {...props}
      translatedCopyLabel={t(labelTKey ?? 'generic copy label')}
    />
  );
};
