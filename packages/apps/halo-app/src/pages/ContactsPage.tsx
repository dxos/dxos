//
// Copyright 2022 DXOS.org
//

import { Plus } from '@phosphor-icons/react';
import React from 'react';

import { useTranslation, Button } from '@dxos/aurora';
import { getSize, staticDisabled, mx } from '@dxos/aurora-theme';
import { HeadingWithActions, Group } from '@dxos/react-appkit';

const ContactsPage = () => {
  const { t } = useTranslation('halo');
  return (
    <>
      <HeadingWithActions
        className='mlb-4'
        heading={{ children: t('contacts label') }}
        actions={
          <Button variant='primary' classNames='grow flex gap-1'>
            <Plus className={getSize(5)} />
            {t('add contact label', { ns: 'appkit' })}
          </Button>
        }
      />
      <Group
        className='mlb-4 p-2 rounded'
        label={{
          level: 2,
          children: t('empty contacts message'),
          className: mx('text-xl', staticDisabled),
        }}
        elevation='base'
      />
    </>
  );
};

export default ContactsPage;
