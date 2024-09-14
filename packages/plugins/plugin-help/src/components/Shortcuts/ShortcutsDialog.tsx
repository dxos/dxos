//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Button, Dialog, Icon, useTranslation } from '@dxos/react-ui';
import { getSize } from '@dxos/react-ui-theme';

import { ShortcutsList } from './ShortcutsList';
import { HELP_PLUGIN } from '../../meta';

export const ShortcutsDialogContent = () => {
  const { t } = useTranslation(HELP_PLUGIN);

  return (
    <Dialog.Content classNames='p-0 bs-content max-bs-full md:max-is-[25rem] overflow-hidden'>
      <div role='none' className='flex justify-between mbe-1 pbs-3 pis-2 pie-3 @md:pbs-4 @md:pis-4 @md:pie-5'>
        <Dialog.Title>{t('shortcuts dialog title')}</Dialog.Title>

        <Dialog.Close asChild>
          <Button density='fine' variant='ghost' autoFocus>
            <Icon icon='ph--x--regular' classNames={getSize(3)} />
          </Button>
        </Dialog.Close>
      </div>

      <div className='flex items-center justify-center'>
        <ShortcutsList />
      </div>
    </Dialog.Content>
  );
};
