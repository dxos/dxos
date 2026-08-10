//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { useCallback } from 'react';

import { type CapabilityManager } from '@dxos/app-framework';
import * as Capability from '@dxos/app-framework/Capability';
import { useOperationInvoker } from '@dxos/app-framework/ui';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { EffectEx } from '@dxos/effect';
import { useClient } from '@dxos/react-client';
import { Dialog, useTranslation } from '@dxos/react-ui';
import { ConfirmReset, type ConfirmResetProps, translationKey } from '@dxos/shell/react';

import { meta } from '#meta';

import * as ClientOptions from '../../types/ClientOptions';

export type ResetDialogProps = Pick<ConfirmResetProps, 'mode'> &
  Pick<ClientOptions.ClientPluginOptions, 'onReset'> & {
    capabilityManager: CapabilityManager.CapabilityManager;
    /**
     * Optional async action run before `client.reset()`. Throwing here aborts the
     * reset so callers can surface errors without wiping local state.
     */
    onBeforeReset?: () => Promise<void>;
  };

export const ResetDialog = ({ mode, onReset, onBeforeReset, capabilityManager }: ResetDialogProps) => {
  const { t } = useTranslation(translationKey);
  const { t: tClient } = useTranslation(meta.profile.key);
  const { invokePromise } = useOperationInvoker();
  const client = useClient();
  // The bare storage reset is presented as logging out; the other modes swap to a new identity.
  const isLogout = (mode ?? 'reset-storage') === 'reset-storage';

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
        <Dialog.Title>{isLogout ? tClient('logout.label') : t('reset-dialog.title')}</Dialog.Title>
      </Dialog.Header>
      <Dialog.Body>
        <Dialog.Description classNames='sr-only'>
          {isLogout ? tClient('logout.description') : t('reset-dialog.description')}
        </Dialog.Description>
        <ConfirmReset
          active
          mode={mode}
          confirmLabel={isLogout ? tClient('logout.label') : undefined}
          onConfirm={handleReset}
          onCancel={handleCancel}
        />
      </Dialog.Body>
    </Dialog.Content>
  );
};

ResetDialog.displayName = 'ResetDialog';
