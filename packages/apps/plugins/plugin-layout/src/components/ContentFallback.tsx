//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { useTranslation } from '@dxos/react-ui';
import { baseSurface, descriptionText, mx } from '@dxos/react-ui-theme';

import { LAYOUT_PLUGIN } from '../meta';

export const ContentFallback = () => {
  const { t } = useTranslation(LAYOUT_PLUGIN);

  // TODO(burdon): Link to open plugins dialog (and suggest plugin?).
  return (
    <div role='none' className={mx(baseSurface, 'min-bs-screen is-full flex items-center justify-center p-8')}>
      <p role='alert' className='border border-dashed border-neutral-400/50 rounded-lg text-center p-8 max-is-[24rem]'>
        <span className='block font-normal text-lg mbe-2'>{t('content fallback message')}</span>
        <span className={mx(descriptionText)}>{t('content fallback description')}</span>
      </p>
    </div>
  );
};
