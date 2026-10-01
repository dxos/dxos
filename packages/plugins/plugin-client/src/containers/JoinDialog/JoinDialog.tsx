//
// Copyright 2024 DXOS.org
//

import React, { useCallback } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as ObservabilityOperation from '@dxos/plugin-observability/ObservabilityOperation';
import { type InvitationResult } from '@dxos/react-client/invitations';
import { Next, useTranslation } from '@dxos/react-ui';
import { JoinPanel, type JoinPanelProps } from '@dxos/shell/react';
import { osTranslations } from '@dxos/ui-theme';

import { meta } from '#meta';
import { ClientOperation } from '#operations';

export const JoinDialog = (props: JoinPanelProps) => {
  const { invokePromise } = useOperationInvoker();
  const { t } = useTranslation(meta.profile.key);

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

  // TODO(burdon): Move JoinHeading into Dialog.Heading.
  return (
    <Next.Dialog.Content>
      <Next.Dialog.Header>
        <Next.Dialog.Title classNames='sr-only'>{t('join-space.label', { ns: osTranslations })}</Next.Dialog.Title>
      </Next.Dialog.Header>
      <Next.Dialog.Body>
        <JoinPanel
          {...props}
          mode='halo-only'
          exitActionParent={<Next.Dialog.CloseTrigger asChild />}
          doneActionParent={<Next.Dialog.CloseTrigger asChild />}
          onCancelResetStorage={handleCancelResetStorage}
          onDone={handleDone}
        />
      </Next.Dialog.Body>
    </Next.Dialog.Content>
  );
};

JoinDialog.displayName = 'JoinDialog';
