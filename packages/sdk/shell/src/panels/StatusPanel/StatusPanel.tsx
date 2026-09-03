//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { Progress, useTranslation } from '@dxos/react-ui';

import { translationKey } from '../../translations.ts';

export const StatusPanel = ({ titleId }: { titleId?: string }) => {
  const { t } = useTranslation(translationKey);
  return (
    <div className='grid place-items-center p-2 gap-2'>
      <p id={titleId} className='font-medium text-center'>
        {t('resetting.message')}
      </p>
      <Progress indeterminate>{t('resetting.message')}</Progress>
    </div>
  );
};
