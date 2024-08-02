//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { Button, Dialog, useTranslation } from '@dxos/react-ui';

import { SPACE_PLUGIN } from '../meta';

export const LimitDialog = () => {
  const { t } = useTranslation(SPACE_PLUGIN);

  return (
    <Dialog.Content classNames='md:max-is-[30rem]'>
      <Dialog.Title>{t('space limit title')}</Dialog.Title>
      <Dialog.Description>{t('space limit description')}</Dialog.Description>
      <div role='none' className='flex justify-end gap-2'>
        <Dialog.Close asChild>
          <Button>{t('close label', { ns: 'os' })}</Button>
        </Dialog.Close>
      </div>
    </Dialog.Content>
  );
};
