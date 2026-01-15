//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { useCallback } from 'react';

import { Capability, Common } from '@dxos/app-framework';

type PluginContext = Parameters<typeof Capability.PluginContextService.of>[0];
import { useOperationInvoker } from '@dxos/app-framework/react';
import { runAndForwardErrors } from '@dxos/effect';
import { useClient } from '@dxos/react-client';
import { Dialog, useTranslation } from '@dxos/react-ui';
import { ConfirmReset, type ConfirmResetProps } from '@dxos/shell/react';

import { meta } from '../meta';
import { type ClientPluginOptions } from '../types';

export type ResetDialogProps = Pick<ConfirmResetProps, 'mode'> &
  Pick<ClientPluginOptions, 'onReset'> & {
    context: PluginContext;
  };

export const ResetDialog = ({ mode, onReset, context }: ResetDialogProps) => {
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();
  const client = useClient();

  const handleReset = useCallback(async () => {
    await client.reset();
    const target =
      mode === 'join new identity' ? 'deviceInvitation' : mode === 'recover' ? 'recoverIdentity' : undefined;
    if (onReset) {
      await runAndForwardErrors(
        onReset({ target }).pipe(Effect.provideService(Capability.PluginContextService, context)),
      );
    }
  }, [client, mode, onReset, context]);

  const handleCancel = useCallback(() => {
    void invokePromise(Common.LayoutOperation.UpdateDialog, { state: false });
  }, [invokePromise]);

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
