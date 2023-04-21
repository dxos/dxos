//
// Copyright 2022 DXOS.org
//

import { Plus } from '@phosphor-icons/react';
import React from 'react';

import { useTranslation, Button, getSize, defaultDisabled, mx } from '@dxos/aurora';
import { HeadingWithActions, Group } from '@dxos/react-appkit';

const ContactsPage = () => {
  const { t } = useTranslation('halo');
  return (
    <>
      <HeadingWithActions
        className='mlb-4'
        heading={{ children: t('contacts label') }}
        actions={
          <Button variant='primary' className='grow flex gap-1'>
            <Plus className={getSize(5)} />
            {t('add contact label', { ns: 'appkit' })}
          </Button>
        }
      />
      <Group
        className='mlb-4'
        label={{
          level: 2,
          children: t('empty contacts message'),
          className: mx('text-xl', defaultDisabled)
        }}
        elevation='base'
      />
    </>
  );
};

export default ContactsPage;
