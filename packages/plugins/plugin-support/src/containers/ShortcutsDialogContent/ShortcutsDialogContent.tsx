//
// Copyright 2023 DXOS.org
//

import React from 'react';

import * as Dialog from '@dxos/react-ui/Dialog';
import * as Hooks from '@dxos/react-ui/Hooks';

import { ShortcutsList } from '#components';
import { meta } from '#meta';

export const ShortcutsDialogContent = () => {
  const { t } = Hooks.useTranslation(meta.profile.key);

  return (
    <Dialog.Content>
      <Dialog.Header>
        <Dialog.Title>{t('shortcuts-dialog.title')}</Dialog.Title>
        <Dialog.Close asChild>
          <Dialog.ActionIconButton action='close' />
        </Dialog.Close>
      </Dialog.Header>
      <Dialog.Body>
        <ShortcutsList />
      </Dialog.Body>
    </Dialog.Content>
  );
};

ShortcutsDialogContent.displayName = 'ShortcutsDialogContent';
