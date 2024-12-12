//
// Copyright 2024 DXOS.org
//

import React, { useCallback } from 'react';

import { LayoutAction, useIntentDispatcher } from '@dxos/app-framework';
import { useClient } from '@dxos/react-client';
import { Clipboard, Dialog } from '@dxos/react-ui';
import { IdentityPanel, type IdentityPanelProps } from '@dxos/shell/react';

import { ClientAction } from '../meta';

export const IdentityDialog = (props: IdentityPanelProps) => {
  const dispatch = useIntentDispatcher();
  const client = useClient();

  const handleDone = useCallback(
    () =>
      dispatch({
        action: LayoutAction.SET_LAYOUT,
        data: {
          element: 'dialog',
          state: false,
        },
      }),
    [dispatch],
  );

  const handleResetStorage = useCallback(async () => {
    await client.reset();
    await dispatch({ action: ClientAction.RESET_STORAGE });
  }, [dispatch]);

  const handleRecover = useCallback(async () => {
    await client.reset();
    await dispatch({ action: ClientAction.RESET_STORAGE, data: { target: 'recoverIdentity' } });
  }, [dispatch]);

  const handleJoinNewIdentity = useCallback(async () => {
    await client.reset();
    await dispatch({ action: ClientAction.RESET_STORAGE, data: { target: 'deviceInvitation' } });
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
