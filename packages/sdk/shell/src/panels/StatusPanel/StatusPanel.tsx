//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { useTranslation } from '@dxos/react-ui';
import { Next } from '@dxos/react-ui/next';

import { translationKey } from '../../translations.ts';

export const StatusPanel = ({ titleId }: { titleId?: string }) => {
  const { t } = useTranslation(translationKey);
  return (
    <div className='grid place-items-center p-2 gap-2'>
      <p id={titleId} className='font-medium text-center'>
        {t('resetting.message')}
      </p>
      <Next.Progress indeterminate>{t('resetting.message')}</Next.Progress>
    </div>
  );
};
