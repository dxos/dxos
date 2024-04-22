//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { useTranslation } from '@dxos/react-ui';
import { errorText, mx } from '@dxos/react-ui-theme';

import { DECK_PLUGIN } from '../meta';

export const Fallback = () => {
  const { t } = useTranslation(DECK_PLUGIN);

  return (
    <div role='none' className='min-bs-screen is-full flex items-center justify-center p-8'>
      <p
        role='alert'
        className={mx(
          errorText,
          'border border-error-400/50 rounded-lg flex items-center justify-center p-8 font-normal text-lg',
        )}
      >
        {t('plugin error message')}
      </p>
    </div>
  );
};
