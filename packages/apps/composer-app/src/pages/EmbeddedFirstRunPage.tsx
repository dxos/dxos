//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { useTranslation } from '@dxos/aurora';

export const EmbeddedFirstRunPage = () => {
  const { t } = useTranslation('composer');
  return (
    <div role='none' className='min-bs-screen is-full flex items-center justify-center p-8'>
      {t('embedded first run message')}
    </div>
  );
};
