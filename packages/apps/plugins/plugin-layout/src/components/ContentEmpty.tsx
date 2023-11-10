//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { useTranslation } from '@dxos/react-ui';
import { descriptionText, mx } from '@dxos/react-ui-theme';

import { LAYOUT_PLUGIN } from '../meta';

export const ContentEmpty = () => {
  const { t } = useTranslation(LAYOUT_PLUGIN);
  return (
    <div
      role='none'
      className='min-bs-screen is-full flex items-center justify-center p-8'
      data-testid='layoutPlugin.firstRunMessage'
    >
      <p
        role='alert'
        className={mx(
          descriptionText,
          'border border-dashed border-neutral-400/50 rounded-xl flex items-center justify-center p-8 font-system-normal text-lg',
        )}
      >
        {t('first run message')}
      </p>
    </div>
  );
};
