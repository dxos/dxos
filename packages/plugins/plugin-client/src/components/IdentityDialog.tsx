//
// Copyright 2024 DXOS.org
//

import React, { useCallback } from 'react';

import { createIntent, LayoutAction, useIntentDispatcher } from '@dxos/app-framework';
import { useClient } from '@dxos/react-client';
import { Clipboard, Dialog } from '@dxos/react-ui';
import { IdentityPanel, type IdentityPanelProps } from '@dxos/shell/react';

import { CLIENT_PLUGIN } from '../meta';
import { ClientAction } from '../types';

export const IDENTITY_DIALOG = `${CLIENT_PLUGIN}/IdentityDialog`;

export const IdentityDialog = (props: IdentityPanelProps) => {
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const client = useClient();

  const handleDone = useCallback(
    () =>
      dispatch(
        createIntent(LayoutAction.SetLayout, {
          element: 'dialog',
          state: false,
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

  return (
    <Dialog.Content>
      <Clipboard.Provider>
        <IdentityPanel
          {...props}
          doneActionParent={<Dialog.Close asChild />}
          onDone={handleDone}
          onResetStorage={handleResetStorage}
          onRecover={handleRecover}
          onJoinNewIdentity={handleJoinNewIdentity}
        />
      </Clipboard.Provider>
    </Dialog.Content>
  );
};
