//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { useTranslation } from '@dxos/react-ui';

import { meta } from '../../meta';

export const Fallback = () => {
  const { t } = useTranslation(meta.id);

  return (
    <div role='none' className='min-h-screen w-full flex items-center justify-center p-8'>
      <p
        role='alert'
        className='flex items-center justify-center p-8 font-normal text-lg text-error-text border border-rose-fill rounded-md'
      >
        {t('plugin error message')}
      </p>
    </div>
  );
};
