//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { useCallback } from 'react';

import * as AppHooks from '@dxos/app-framework/Hooks';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as EffectEx from '@dxos/effect/EffectEx';
import { useClient } from '@dxos/react-client';
import * as Dialog from '@dxos/react-ui/Dialog';
import * as Hooks from '@dxos/react-ui/Hooks';
import { ConfirmReset, type ConfirmResetProps } from '@dxos/shell/react';

import { meta } from '#meta';
import { ClientOperation } from '#operations';
import { ClientCapabilities } from '#types';

export type ResetDialogProps = Pick<ConfirmResetProps, 'mode'> & {
  /** Device invitation to accept once the identity is gone (`join-new-identity` only). */
  invitationCode?: string;
  /**
   * Optional async action run before the identity is deleted. Throwing here aborts the
   * deletion so callers can surface errors without wiping local state.
   */
  onBeforeReset?: () => Promise<void>;
};

/**
 * Confirms, then deletes the local identity in place and hands over to the flow that brings the next
 * one in — the client stays open throughout, so nothing reloads.
 */
export const ResetDialog = ({ mode, invitationCode, onBeforeReset }: ResetDialogProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const { invokePromise } = AppHooks.useOperationInvoker();
  const client = useClient();
  const onIdentityDeleted = AppHooks.useCapabilities(ClientCapabilities.OnIdentityDeleted);

  const handleReset = useCallback(async () => {
    if (onBeforeReset) {
      await onBeforeReset();
    }
    await client.halo.deleteIdentity();

    // Each replaces this dialog, so the confirmation hands straight over to the next identity's flow.
    // A plain logout closes it first, leaving the dialog slot free for whatever the hooks open.
    const target =
      mode === 'join-new-identity' ? 'deviceInvitation' : mode === 'recover' ? 'recoverIdentity' : undefined;
    if (mode === 'join-new-identity') {
      await invokePromise(ClientOperation.JoinIdentity, { invitationCode });
    } else if (mode === 'recover') {
      await invokePromise(ClientOperation.RecoverIdentity);
    } else {
      await invokePromise(LayoutOperation.UpdateDialog, { state: false });
    }
    await EffectEx.runAndForwardErrors(Effect.all(onIdentityDeleted.map((hook) => hook({ target }))));
  }, [client, mode, invitationCode, onBeforeReset, onIdentityDeleted, invokePromise]);

  const handleCancel = useCallback(() => {
    void invokePromise(LayoutOperation.UpdateDialog, { state: false });
  }, [invokePromise]);

  return (
    <Dialog.Content>
      <Dialog.Header>
        <Dialog.Title>{t('logout.label')}</Dialog.Title>
      </Dialog.Header>
      <Dialog.Body>
        <Dialog.Description classNames='sr-only'>{t('logout.description')}</Dialog.Description>
        <ConfirmReset
          active
          mode={mode}
          confirmLabel={t('logout.label')}
          onConfirm={handleReset}
          onCancel={handleCancel}
        />
      </Dialog.Body>
    </Dialog.Content>
  );
};

ResetDialog.displayName = 'ResetDialog';
