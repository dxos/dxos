//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Button, Dialog, useTranslation } from '@dxos/react-ui';

import { ShortcutsList } from './ShortcutsList';
import { HELP_PLUGIN } from '../../meta';

export const ShortcutsDialogContent = () => {
  const { t } = useTranslation(HELP_PLUGIN);

  return (
    <Dialog.Content classNames={'max-bs-[40rem] md:is-auto overflow-hidden'}>
      <Dialog.Title>{t('shortcuts dialog title')}</Dialog.Title>

      <div className='grow overflow-y-auto py-2'>
        <ShortcutsList />
      </div>

      <Dialog.Close asChild>
        <Button variant='primary' classNames='mbs-2'>
          {t('close label', { ns: 'os' })}
        </Button>
      </Dialog.Close>
    </Dialog.Content>
  );
};
