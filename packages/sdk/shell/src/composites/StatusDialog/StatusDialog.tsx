//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { AlertDialog, useId, useTranslation } from '@dxos/react-ui';

import { StatusPanel } from '../../panels';
import { translationKey } from '../../translations';

export const StatusDialog = () => {
  const { t } = useTranslation(translationKey);
  const titleId = useId('statusDialog__title');
  return (
    <AlertDialog.Root open>
      <AlertDialog.Portal>
        <AlertDialog.Overlay>
          <AlertDialog.Content aria-labelledby={titleId}>
            <AlertDialog.Body>
              <AlertDialog.Description srOnly>{t('resetting.message')}</AlertDialog.Description>
              <StatusPanel titleId={titleId} />
            </AlertDialog.Body>
          </AlertDialog.Content>
        </AlertDialog.Overlay>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
};
