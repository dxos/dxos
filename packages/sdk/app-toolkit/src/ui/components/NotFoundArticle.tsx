//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Icon, useTranslation } from '@dxos/react-ui';
import { osTranslations } from '@dxos/ui-theme';

/**
 * Article surface component rendered when navigating to a non-existent object.
 */
export const NotFoundArticle = () => {
  const { t } = useTranslation(osTranslations);
  return (
    <div role='none' className='flex flex-col items-center justify-center h-full gap-4 p-8'>
      <Icon icon='ph--warning--regular' size={12} />
      <h2 className='text-lg font-medium'>{t('not-found.heading')}</h2>
      <p className='text-sm text-description'>{t('not-found.description')}</p>
    </div>
  );
};
