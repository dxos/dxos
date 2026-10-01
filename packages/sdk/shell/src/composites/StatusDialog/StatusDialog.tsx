//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Next, useId, useTranslation } from '@dxos/react-ui';

import { StatusPanel } from '../../panels/index.ts';
import { translationKey } from '../../translations.ts';

export const StatusDialog = () => {
  const { t } = useTranslation(translationKey);
  const titleId = useId('statusDialog__title');
  return (
    <Next.AlertDialog.Root open>
      <Next.AlertDialog.Content aria-labelledby={titleId}>
        <Next.AlertDialog.Body>
          <Next.AlertDialog.Description srOnly>{t('resetting.message')}</Next.AlertDialog.Description>
          <StatusPanel titleId={titleId} />
        </Next.AlertDialog.Body>
      </Next.AlertDialog.Content>
    </Next.AlertDialog.Root>
  );
};
