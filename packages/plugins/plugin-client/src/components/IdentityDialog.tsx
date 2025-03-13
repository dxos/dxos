//
// Copyright 2024 DXOS.org
//

import React, { useCallback } from 'react';

import { createIntent, LayoutAction, useIntentDispatcher } from '@dxos/app-framework';
import { useClient } from '@dxos/react-client';
import { Clipboard, Dialog, useTranslation } from '@dxos/react-ui';
import { IdentityPanel, type IdentityPanelProps } from '@dxos/shell/react';

import { MANAGE_CREDENTIALS_DIALOG } from './ManageCredentialsDialog';
import { CLIENT_PLUGIN } from '../meta';
import { ClientAction } from '../types';

export const IDENTITY_DIALOG = `${CLIENT_PLUGIN}/IdentityDialog`;

export const IdentityDialog = (props: IdentityPanelProps) => {
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const client = useClient();
  const { t } = useTranslation(CLIENT_PLUGIN);

  const handleDone = useCallback(
    () =>
      dispatch(
        createIntent(LayoutAction.UpdateDialog, {
          part: 'dialog',
          options: { state: false },
        }),
      ),
    [dispatch],
  );

  const handleResetStorage = useCallback(async () => {
    await client.reset();
    await dispatch(createIntent(ClientAction.ResetStorage));
  }, [dispatch]);

  const handleRecover = useCallback(async () => {
    await client.reset();
    await dispatch(createIntent(ClientAction.ResetStorage, { target: 'recoverIdentity' }));
  }, [dispatch]);

  const handleJoinNewIdentity = useCallback(async () => {
    await client.reset();
    await dispatch(createIntent(ClientAction.ResetStorage, { target: 'deviceInvitation' }));
  }, [dispatch]);

  const handleManageCredentials = useCallback(async () => {
    await dispatch(
      createIntent(LayoutAction.UpdateDialog, {
        part: 'dialog',
        subject: MANAGE_CREDENTIALS_DIALOG,
        options: { state: true, blockAlign: 'start' },
      }),
    );
  }, [dispatch]);

  return (
    <Dialog.Content>
      <Dialog.Title classNames='sr-only'>{t('manage profile label', { ns: 'os' })}</Dialog.Title>
      <Clipboard.Provider>
        <IdentityPanel
          {...props}
          doneActionParent={<Dialog.Close asChild />}
          onDone={handleDone}
          onResetStorage={handleResetStorage}
          onRecover={handleRecover}
          onJoinNewIdentity={handleJoinNewIdentity}
          onManageCredentials={handleManageCredentials}
        />
      </Clipboard.Provider>
    </Dialog.Content>
  );
};
