//
// Copyright 2022 DXOS.org
//

import { DiamondsFour } from 'phosphor-react';
import React from 'react';

import { Main, useTranslation, Button, getSize } from '@dxos/react-uikit';

import { HeadingWithActions } from '../../components/HeadingWithActions';

export const AppsPage = () => {
  const { t } = useTranslation('halo');
  return (
    <Main className='max-w-7xl mx-auto'>
      <HeadingWithActions
        heading={{ children: t('apps label') }}
        actions={
          <Button variant='primary' className='grow flex gap-1'>
            <DiamondsFour className={getSize(5)} />
            {t('open apps directory label', { ns: 'uikit' })}
          </Button>
        }
      />
    </Main>
  );
};
