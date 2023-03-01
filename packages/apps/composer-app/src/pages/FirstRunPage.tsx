//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { defaultDescription, mx, useTranslation } from '@dxos/react-components';

export const FirstRunPage = () => {
  const { t } = useTranslation('composer');
  return (
    <div role='none' className='min-bs-screen is-full flex items-center justify-center p-8'>
      <p
        role='alert'
        className={mx(
          defaultDescription,
          'border border-dashed border-neutral-400/50 rounded-xl flex items-center justify-center p-8 font-system-medium text-lg'
        )}
      >
        {t('first run message')}
      </p>
    </div>
  );
};
