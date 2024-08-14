//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { useSpace } from '@dxos/react-client/echo';
import { Button, Dialog, useTranslation } from '@dxos/react-ui';

import { SPACE_PLUGIN } from '../meta';

export const LimitDialog = ({ spaceId }: { spaceId: string }) => {
  const { t } = useTranslation(SPACE_PLUGIN);
  const space = useSpace(spaceId);

  return (
    <Dialog.Content classNames='md:max-is-[30rem]'>
      <Dialog.Title>{t('space limit title')}</Dialog.Title>
      <Dialog.Description>{t('space limit description')}</Dialog.Description>
      <div role='none' className='flex justify-end gap-2'>
        {space && (
          <Dialog.Close asChild>
            <Button onClick={() => space?.db.coreDatabase.unlinkDeletedObjects()}>
              {t('remove deleted objects label')}
            </Button>
          </Dialog.Close>
        )}
        <Dialog.Close asChild>
          <Button>{t('close label', { ns: 'os' })}</Button>
        </Dialog.Close>
      </div>
    </Dialog.Content>
  );
};
