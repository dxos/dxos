//
// Copyright 2022 DXOS.org
//

import cx from 'classnames';
import { Plus } from 'phosphor-react';
import React from 'react';

import { HeadingWithActions } from '@dxos/react-appkit';
import { useTranslation, Button, getSize, defaultDisabled, Group } from '@dxos/react-uikit';

export const ContactsPage = () => {
  const { t } = useTranslation('halo');
  return (
    <>
      <HeadingWithActions
        className='mlb-4'
        heading={{ children: t('contacts label') }}
        actions={
          <Button variant='primary' className='grow flex gap-1'>
            <Plus className={getSize(5)} />
            {t('add contact label', { ns: 'uikit' })}
          </Button>
        }
      />
      <Group
        className='mlb-4'
        label={{
          level: 2,
          children: t('empty contacts message'),
          className: cx('text-xl', defaultDisabled)
        }}
        elevation={0}
      />
    </>
  );
};
