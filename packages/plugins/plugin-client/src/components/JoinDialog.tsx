//
// Copyright 2024 DXOS.org
//

import React, { useCallback } from 'react';

import { Common } from '@dxos/app-framework';
import { useOperationInvoker } from '@dxos/app-framework/react';
import { ObservabilityOperation } from '@dxos/plugin-observability/types';
import { type InvitationResult } from '@dxos/react-client/invitations';
import { Dialog, useTranslation } from '@dxos/react-ui';
import { JoinPanel, type JoinPanelProps } from '@dxos/shell/react';

import { meta } from '../meta';
import { ClientOperation } from '../types';

export const JoinDialog = (props: JoinPanelProps) => {
  const { invokePromise } = useOperationInvoker();
  const { t } = useTranslation(meta.id);

  const handleCancelResetStorage = useCallback(
    () => invokePromise(ClientOperation.ShareIdentity),
    [invokePromise],
  );

  const handleDone = useCallback(
    async (result: InvitationResult | null) => {
      if (result?.identityKey) {
        await Promise.all([
          invokePromise(Common.LayoutOperation.UpdateDialog, { state: false }),
          invokePromise(ObservabilityOperation.SendEvent, {
            name: props.initialDisposition === 'recover-identity' ? 'identity.recover' : 'identity.join',
          }),
        ]);
      }
    },
    [invokePromise],
  );

  return (
    <Dialog.Content>
      <Dialog.Title classNames='sr-only'>{t('join space label', { ns: 'os' })}</Dialog.Title>
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
