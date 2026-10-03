//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Dialog, SystemButton, useTranslation } from '@dxos/react-ui';

import { ShortcutsList } from '#components';
import { meta } from '#meta';

export const ShortcutsDialogContent = () => {
  const { t } = useTranslation(meta.profile.key);

  return (
    <Dialog.Content>
      <Dialog.Header>
        <Dialog.Title>{t('shortcuts-dialog.title')}</Dialog.Title>
        <Dialog.CloseTrigger asChild>
          <SystemButton.Close />
        </Dialog.CloseTrigger>
      </Dialog.Header>
      <Dialog.Body>
        <ShortcutsList />
      </Dialog.Body>
    </Dialog.Content>
  );
};

ShortcutsDialogContent.displayName = 'ShortcutsDialogContent';
