//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Dialog, useTranslation } from '@dxos/react-ui';

import { ShortcutsList } from '../../components';
import { meta } from '../../meta';

export const ShortcutsDialogContent = () => {
  const { t } = useTranslation(meta.id);

  return (
    <Dialog.Content>
      <Dialog.Header>
        <Dialog.Title>{t('shortcuts dialog title')}</Dialog.Title>
        <Dialog.Close asChild>
          <Dialog.CloseIconButton />
        </Dialog.Close>
      </Dialog.Header>
      <Dialog.Body>
        <ShortcutsList />
      </Dialog.Body>
    </Dialog.Content>
  );
};
