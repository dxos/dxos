//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { useCallback } from 'react';

import { Capability, type CapabilityManager } from '@dxos/app-framework';
import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { EffectEx } from '@dxos/effect';
import { useClient } from '@dxos/react-client';
import { Dialog, useTranslation } from '@dxos/react-ui';
import { ConfirmReset, type ConfirmResetProps, translationKey } from '@dxos/shell/react';

import { type ClientPluginOptions } from '#types';

export type ResetDialogProps = Pick<ConfirmResetProps, 'mode'> &
  Pick<ClientPluginOptions, 'onReset'> & {
    capabilityManager: CapabilityManager.CapabilityManager;
    /**
     * Optional async action run before `client.reset()`. Throwing here aborts the
     * reset so callers can surface errors without wiping local state.
     */
    onBeforeReset?: () => Promise<void>;
  };

export const ResetDialog = ({ mode, onReset, onBeforeReset, capabilityManager }: ResetDialogProps) => {
  const { t } = useTranslation(translationKey);
  const { invokePromise } = useOperationInvoker();
  const client = useClient();

  const handleReset = useCallback(async () => {
    if (onBeforeReset) {
      await onBeforeReset();
    }
    await client.reset();
    const target =
      mode === 'join-new-identity' ? 'deviceInvitation' : mode === 'recover' ? 'recoverIdentity' : undefined;
    if (onReset) {
      await EffectEx.runAndForwardErrors(
        onReset({ target }).pipe(Effect.provideService(Capability.Service, capabilityManager)),
      );
    }
  }, [client, mode, onReset, capabilityManager]);

  const handleCancel = useCallback(() => {
    void invokePromise(LayoutOperation.UpdateDialog, { state: false });
  }, [invokePromise]);

  return (
    <Dialog.Content>
      <Dialog.Header>
        <Dialog.Title>{t('reset-dialog.title')}</Dialog.Title>
      </Dialog.Header>
      <Dialog.Body>
        <Dialog.Description classNames='sr-only'>{t('reset-dialog.description')}</Dialog.Description>
        <ConfirmReset active mode={mode} onConfirm={handleReset} onCancel={handleCancel} />
      </Dialog.Body>
    </Dialog.Content>
  );
};

ResetDialog.displayName = 'ResetDialog';
