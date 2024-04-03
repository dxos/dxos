//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { Status, useTranslation } from '@dxos/react-ui';

export const StatusPanel = ({ titleId }: { titleId?: string }) => {
  const { t } = useTranslation('os');
  return (
    <div className='grid place-items-center p-2 gap-2'>
      <p id={titleId} className='font-medium text-center'>
        {t('resetting message')}
      </p>
      <Status indeterminate>{t('resetting message')}</Status>
    </div>
  );
};
