//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Surface } from '@dxos/app-framework';
import { Button, Dialog, useTranslation } from '@dxos/react-ui';

import { LAYOUT_PLUGIN } from '../meta';

// TODO(burdon): Plugins should register ts-effect object to configure settings.

export const PreferencesDialogContent = () => {
  const { t } = useTranslation(LAYOUT_PLUGIN);

  return (
    <Dialog.Content classNames='max-is-[32rem]'>
      <Dialog.Title>{t('settings dialog title', { ns: 'os' })}</Dialog.Title>
      <div className='mlb-4 space-b-4'>
        <Surface role='settings' />
      </div>
      <Dialog.Close asChild>
        <Button variant='primary' classNames='mbs-2'>
          {t('done label', { ns: 'os' })}
        </Button>
      </Dialog.Close>
    </Dialog.Content>
  );
};
