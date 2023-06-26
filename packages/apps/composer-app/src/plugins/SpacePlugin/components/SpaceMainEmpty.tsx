//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { useTranslation } from '@dxos/aurora';
import { defaultDescription, mx } from '@dxos/aurora-theme';

export const SpaceMainEmpty = () => {
  const { t } = useTranslation('composer');
  return (
    <div
      role='none'
      className='min-bs-screen is-full flex items-center justify-center p-8'
      data-testid='composer.firstRunMessage'
    >
      <p
        role='alert'
        className={mx(
          defaultDescription,
          'border border-dashed border-neutral-400/50 rounded-xl flex items-center justify-center p-8 font-system-normal text-lg',
        )}
      >
        {t('first run message')}
      </p>
    </div>
  );
};
