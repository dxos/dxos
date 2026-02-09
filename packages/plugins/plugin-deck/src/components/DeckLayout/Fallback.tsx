//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { useTranslation } from '@dxos/react-ui';
import { errorText, mx } from '@dxos/ui-theme';

import { meta } from '../../meta';

export const Fallback = () => {
  const { t } = useTranslation(meta.id);

  return (
    <div role='none' className='min-bs-screen is-full flex items-center justify-center p-8'>
      <p
        role='alert'
        className={mx(
          errorText,
          'border border-roseFill rounded-md flex items-center justify-center p-8 font-normal text-lg',
        )}
      >
        {t('plugin error message')}
      </p>
    </div>
  );
};
