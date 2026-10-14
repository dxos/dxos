//
// Copyright 2024 DXOS.org
//

import React, { useCallback } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as ObservabilityOperation from '@dxos/plugin-observability/ObservabilityOperation';
import { type InvitationResult } from '@dxos/react-client/invitations';
import * as Dialog from '@dxos/react-ui/Dialog';
import { JoinPanel, type JoinPanelProps } from '@dxos/shell/react';

import { ClientOperation } from '#operations';

export const JoinDialog = (props: JoinPanelProps) => {
  const { invokePromise } = Hooks.useOperationInvoker();

  const handleCancelResetStorage = useCallback(() => invokePromise(ClientOperation.ShareIdentity), [invokePromise]);

  const handleDone = useCallback(
    async (result: InvitationResult | null) => {
      if (result?.identityKey) {
        await Promise.all([
          invokePromise(LayoutOperation.UpdateDialog, { state: false }),
          // A device join is reported by the client when its invitation succeeds; recovery uses no invitation.
          props.initialDisposition === 'recover-identity' &&
            invokePromise(ObservabilityOperation.SendEvent, { name: 'identity.recover' }),
        ]);
      }
    },
    [invokePromise],
  );

  // The panel supplies the Header (and its Title), then each step's Body and Footer.
  return (
    <Dialog.Content>
      <JoinPanel
        {...props}
        mode='halo-only'
        exitActionParent={<Dialog.CloseTrigger asChild />}
        doneActionParent={<Dialog.CloseTrigger asChild />}
        onCancelResetStorage={handleCancelResetStorage}
        onDone={handleDone}
      />
    </Dialog.Content>
  );
};

JoinDialog.displayName = 'JoinDialog';
