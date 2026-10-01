//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { useTranslation } from '@dxos/react-ui';
import { Next } from '@dxos/react-ui/next';

import { ShortcutsList } from '#components';
import { meta } from '#meta';

export const ShortcutsDialogContent = () => {
  const { t } = useTranslation(meta.profile.key);

  return (
    <Next.Dialog.Content>
      <Next.Dialog.Header>
        <Next.Dialog.Title>{t('shortcuts-dialog.title')}</Next.Dialog.Title>
        <Next.Dialog.CloseTrigger asChild>
          <Next.SystemButton.Close />
        </Next.Dialog.CloseTrigger>
      </Next.Dialog.Header>
      <Next.Dialog.Body>
        <ShortcutsList />
      </Next.Dialog.Body>
    </Next.Dialog.Content>
  );
};

ShortcutsDialogContent.displayName = 'ShortcutsDialogContent';
