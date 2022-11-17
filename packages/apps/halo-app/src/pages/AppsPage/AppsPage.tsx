//
// Copyright 2022 DXOS.org
//

import { DiamondsFour } from 'phosphor-react';
import React from 'react';

import { HeadingWithActions } from '@dxos/react-appkit';
import { useTranslation, Button, getSize } from '@dxos/react-uikit';

export const AppsPage = () => {
  const { t } = useTranslation('halo');
  return (
    <main className='max-is-5xl mli-auto pli-7'>
      <HeadingWithActions
        heading={{ children: t('apps label') }}
        actions={
          <Button variant='primary' className='grow flex gap-1'>
            <DiamondsFour className={getSize(5)} />
            {t('open apps directory label', { ns: 'uikit' })}
          </Button>
        }
      />
    </main>
  );
};
