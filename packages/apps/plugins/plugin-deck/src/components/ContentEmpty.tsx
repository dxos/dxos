//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Surface } from '@dxos/app-framework';
import { useTranslation } from '@dxos/react-ui';
import { descriptionText, mx } from '@dxos/react-ui-theme';

import { DECK_PLUGIN } from '../meta';

export const ContentEmpty = () => {
  const { t } = useTranslation(DECK_PLUGIN);
  return (
    <div
      role='none'
      className='min-bs-screen is-full flex items-center justify-center p-8'
      data-testid='layoutPlugin.firstRunMessage'
    >
      <div role='none' className='grid place-items-center grid-rows-[min-content_min-content]'>
        <p
          role='alert'
          className={mx(
            descriptionText,
            'place-self-stretch border border-dashed border-neutral-400/50 rounded-lg text-center p-8 font-normal text-lg',
          )}
        >
          {t('first run message')}
        </p>
        <Surface role='keyshortcuts' />
      </div>
    </div>
  );
};
