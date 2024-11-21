//
// Copyright 2024 DXOS.org
//

import React, { useCallback } from 'react';

import { LayoutAction, useIntentDispatcher } from '@dxos/app-framework';
import { type InvitationResult } from '@dxos/react-client/invitations';
import { Dialog } from '@dxos/react-ui';
import { JoinPanel, type JoinPanelProps } from '@dxos/shell/react';

import { CLIENT_PLUGIN, ClientAction, OBSERVABILITY_ACTION } from '../meta';

export const JoinDialog = (props: JoinPanelProps) => {
  const dispatch = useIntentDispatcher();

  const handleCancelResetStorage = useCallback(
    () => dispatch({ plugin: CLIENT_PLUGIN, action: ClientAction.SHARE_IDENTITY }),
    [dispatch],
  );

  const handleDone = useCallback(
    async (result: InvitationResult | null) => {
      if (result?.identityKey) {
        await Promise.all([
          dispatch({
            action: LayoutAction.SET_LAYOUT,
            data: {
              element: 'dialog',
              state: false,
            },
          }),
          dispatch({
            action: OBSERVABILITY_ACTION,
            data: {
              name: props.initialDisposition === 'recover-identity' ? 'identity.recover' : 'identity.join',
            },
          }),
        ]);
      }
    },
    [dispatch],
  );

  return (
    <Dialog.Content>
      <JoinPanel
        mode='halo-only'
        {...props}
        exitActionParent={<Dialog.Close asChild />}
        doneActionParent={<Dialog.Close asChild />}
        onCancelResetStorage={handleCancelResetStorage}
        onDone={handleDone}
      />
    </Dialog.Content>
  );
};
