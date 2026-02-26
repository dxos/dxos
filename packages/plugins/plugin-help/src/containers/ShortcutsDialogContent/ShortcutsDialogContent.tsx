//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Dialog, IconButton, useTranslation } from '@dxos/react-ui';

import { ShortcutsList } from '../../components/Shortcuts';
import { meta } from '../../meta';

export const ShortcutsDialogContent = () => {
  const { t } = useTranslation(meta.id);

  return (
    <Dialog.Content>
      <div role='none' className='flex justify-between mb-1 pt-3 ps-2 pe-3 @md:pt-4 @md:ps-4 @md:pe-5'>
        <Dialog.Title>{t('shortcuts dialog title')}</Dialog.Title>
        <Dialog.Close asChild>
          <IconButton icon='ph--x--bold' iconOnly size={3} label='Close' variant='ghost' autoFocus />
        </Dialog.Close>
      </div>

      <div className='flex items-center justify-center'>
        <ShortcutsList />
      </div>
    </Dialog.Content>
  );
};
