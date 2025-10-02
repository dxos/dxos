//
// Copyright 2025 DXOS.org
//

import React, { useCallback } from 'react';

import { LayoutAction, createIntent, useIntentDispatcher } from '@dxos/app-framework';
import { useClient } from '@dxos/react-client';
import { Dialog, useTranslation } from '@dxos/react-ui';
import { ConfirmReset, type ConfirmResetProps } from '@dxos/shell/react';

import { meta } from '../meta';
import { type ClientPluginOptions } from '../types';

export const RESET_DIALOG = `${meta.id}/ResetDialog`;

export type ResetDialogProps = Pick<ConfirmResetProps, 'mode'> & Pick<ClientPluginOptions, 'onReset'>;

export const ResetDialog = ({ mode, onReset }: ResetDialogProps) => {
  const { t } = useTranslation(meta.id);
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const client = useClient();

  const handleReset = useCallback(async () => {
    await client.reset();
    const target =
      mode === 'join new identity' ? 'deviceInvitation' : mode === 'recover' ? 'recoverIdentity' : undefined;
    await onReset?.({ target });
  }, [dispatch, client, mode, onReset]);

  const handleCancel = useCallback(() => {
    void dispatch(
      createIntent(LayoutAction.UpdateDialog, {
        part: 'dialog',
        options: { state: false },
      }),
    );
  }, [dispatch]);

  // TODO(wittjosiah): Add the sr-only translations.
  // TODO(wittjosiah): Add missing descriptions to other dialogs.
  return (
    <Dialog.Content classNames='bs-content min-bs-[15rem] max-bs-full md:max-is-[40rem] overflow-hidden'>
      <Dialog.Title classNames='sr-only'>{t('reset dialog title')}</Dialog.Title>
      <Dialog.Description classNames='sr-only'>{t('reset dialog description')}</Dialog.Description>
      <ConfirmReset active mode={mode} onConfirm={handleReset} onCancel={handleCancel} />
    </Dialog.Content>
  );
};
