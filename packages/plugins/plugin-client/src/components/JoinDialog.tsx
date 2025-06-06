//
// Copyright 2024 DXOS.org
//

import React, { useCallback } from 'react';

import { createIntent, LayoutAction, useIntentDispatcher } from '@dxos/app-framework';
import { ObservabilityAction } from '@dxos/plugin-observability/types';
import { type InvitationResult } from '@dxos/react-client/invitations';
import { Dialog, useTranslation } from '@dxos/react-ui';
import { JoinPanel, type JoinPanelProps } from '@dxos/shell/react';

import { CLIENT_PLUGIN } from '../meta';
import { ClientAction } from '../types';

export const JOIN_DIALOG = `${CLIENT_PLUGIN}/JoinDialog`;

export const JoinDialog = (props: JoinPanelProps) => {
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const { t } = useTranslation(CLIENT_PLUGIN);

  const handleCancelResetStorage = useCallback(() => dispatch(createIntent(ClientAction.ShareIdentity)), [dispatch]);

  const handleDone = useCallback(
    async (result: InvitationResult | null) => {
      if (result?.identityKey) {
        await Promise.all([
          dispatch(createIntent(LayoutAction.UpdateDialog, { part: 'dialog', options: { state: false } })),
          dispatch(
            createIntent(ObservabilityAction.SendEvent, {
              name: props.initialDisposition === 'recover-identity' ? 'identity.recover' : 'identity.join',
            }),
          ),
        ]);
      }
    },
    [dispatch],
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
