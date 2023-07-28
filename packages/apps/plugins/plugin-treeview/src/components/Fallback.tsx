//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { useTranslation } from '@dxos/aurora';
import { errorText, mx } from '@dxos/aurora-theme';

import { TREE_VIEW_PLUGIN } from '../types';

export const Fallback = () => {
  const { t } = useTranslation(TREE_VIEW_PLUGIN);

  return (
    <div role='none' className='min-bs-screen is-full flex items-center justify-center p-8'>
      <p
        role='alert'
        className={mx(
          errorText,
          'border border-error-400/50 rounded-xl flex items-center justify-center p-8 font-system-normal text-lg',
        )}
      >
        {t('plugin error message')}
      </p>
    </div>
  );
};
