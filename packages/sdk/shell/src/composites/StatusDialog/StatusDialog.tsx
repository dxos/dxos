//
// Copyright 2023 DXOS.org
//

import React from 'react';

import * as AlertDialog from '@dxos/react-ui/AlertDialog';
import * as Hooks from '@dxos/react-ui/Hooks';

import { StatusPanel } from '../../panels/index.ts';
import { translationKey } from '../../translations.ts';

export const StatusDialog = () => {
  const { t } = Hooks.useTranslation(translationKey);
  const titleId = Hooks.useId('statusDialog__title');
  return (
    <AlertDialog.Root open>
      <AlertDialog.Content aria-labelledby={titleId}>
        <AlertDialog.Body>
          <AlertDialog.Description srOnly>{t('resetting.message')}</AlertDialog.Description>
          <StatusPanel titleId={titleId} />
        </AlertDialog.Body>
      </AlertDialog.Content>
    </AlertDialog.Root>
  );
};
