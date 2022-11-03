//
// Copyright 2022 DXOS.org
//

import { Plus } from 'phosphor-react';
import React from 'react';

import { useTranslation, Button, getSize } from '@dxos/react-uikit';

import { HeadingWithActions } from '../../components';

export const ContactsPage = () => {
  const { t } = useTranslation('halo');
  return (
    <main className='max-is-5xl mli-auto pli-7'>
      <HeadingWithActions
        heading={{ children: t('contacts label') }}
        actions={
          <Button variant='primary' className='grow flex gap-1'>
            <Plus className={getSize(5)} />
            {t('add contact label', { ns: 'uikit' })}
          </Button>
        }
      />
    </main>
  );
};
