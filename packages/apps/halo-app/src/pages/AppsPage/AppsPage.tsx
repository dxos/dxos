//
// Copyright 2022 DXOS.org
//

import cx from 'classnames';
import { DiamondsFour } from 'phosphor-react';
import React from 'react';

import { HeadingWithActions } from '@dxos/react-appkit';
import { useTranslation, Button, getSize, defaultDisabled, Group } from '@dxos/react-uikit';

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
      <Group
        className='mlb-4'
        label={{
          level: 2,
          children: t('empty apps message'),
          className: cx('text-xl', defaultDisabled)
        }}
        elevation={0}
      />
    </main>
  );
};
