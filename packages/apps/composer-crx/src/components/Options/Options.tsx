//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { Composer } from '@dxos/brand';
import { IconButton, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

export type OptionsProps = ThemedClassName<{}>;

export const Options = ({ classNames }: OptionsProps) => {
  const { t } = useTranslation('composer');

  const handleAuth = () => {};

  return (
    <div className={mx('flex flex-col grow gap-4 overflow-y-auto bg-baseSurface', classNames)}>
      <div className='grid grid-cols-[8rem_1fr] p-4'>
        <a href='https://dxos.org/composer' target='_blank' rel='noreferrer'>
          <Composer className='is-[8rem] bs-[8rem]' />
        </a>
        <div className='grid grid-rows-[1fr_1fr]'>
          <div />
          <div>
            <h1 className='text-2xl'>{t('composer.title')}</h1>
            <p className='text-sm text-subdued'>{t('composer.description')}</p>
          </div>
        </div>
      </div>

      <div className='flex flex-col gap-4'>
        <div className='flex justify-center'>
          <IconButton icon='ph--user--regular' label={t('button.auth')} onClick={handleAuth} />
        </div>
      </div>
    </div>
  );
};
