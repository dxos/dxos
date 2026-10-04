//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { AlertDialog, useId, useTranslation } from '@dxos/react-ui';

import { StatusPanel } from '../../panels/index.ts';
import { translationKey } from '../../translations.ts';

export const StatusDialog = () => {
  const { t } = useTranslation(translationKey);
  const titleId = useId('statusDialog__title');
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
