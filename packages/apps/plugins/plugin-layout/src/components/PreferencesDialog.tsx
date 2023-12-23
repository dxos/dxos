//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Surface, type SurfaceProps } from '@dxos/app-framework';
import { Button, Dialog, useTranslation } from '@dxos/react-ui';

import { LAYOUT_PLUGIN } from '../meta';

// TODO(burdon): Plugins should register ts-effect object to describe settings.

export const PreferencesDialogContent = ({ data }: Pick<SurfaceProps, 'data'>) => {
  const { t } = useTranslation(LAYOUT_PLUGIN);

  return (
    <Dialog.Content classNames='max-is-[32rem]'>
      <Dialog.Title>{t('settings dialog title', { ns: 'os' })}</Dialog.Title>
      <div className='mlb-4 space-b-4'>
        11
        <Surface role='settings' />
        22
      </div>
      <Dialog.Close asChild>
        <Button variant='primary' classNames='mbs-2'>
          {t('done label', { ns: 'os' })}
        </Button>
      </Dialog.Close>
    </Dialog.Content>
  );
};
