//
// Copyright 2024 DXOS.org
//

import React, { useCallback } from 'react';

import { createIntent, LayoutAction, useAppGraph, useIntentDispatcher } from '@dxos/app-framework';
import { log } from '@dxos/log';
import { ObservabilityAction } from '@dxos/plugin-observability/types';
import { useClient } from '@dxos/react-client';
import { type InvitationResult } from '@dxos/react-client/invitations';
import { Dialog, useTranslation } from '@dxos/react-ui';
import { JoinPanel, type JoinPanelProps } from '@dxos/shell/react';

import { SPACE_PLUGIN } from '../meta';

export const JOIN_DIALOG = `${SPACE_PLUGIN}/JoinDialog`;

export type JoinDialogProps = JoinPanelProps & {
  navigableCollections?: boolean;
};

export const JoinDialog = ({ navigableCollections, onDone, ...props }: JoinDialogProps) => {
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const client = useClient();
  const { graph } = useAppGraph();
  const { t } = useTranslation(SPACE_PLUGIN);

  const handleDone = useCallback(
    async (result: InvitationResult | null) => {
      if (result?.spaceKey) {
        await Promise.all([
          dispatch(
            createIntent(LayoutAction.AddToast, {
              part: 'toast',
              subject: {
                id: `${SPACE_PLUGIN}/join-success`,
                duration: 5_000,
                title: ['join success label', { ns: SPACE_PLUGIN }],
                closeLabel: ['dismiss label', { ns: SPACE_PLUGIN }],
              },
            }),
          ),
          dispatch(
            createIntent(LayoutAction.UpdateDialog, {
              part: 'dialog',
              options: {
                state: false,
              },
            }),
          ),
        ]);
      }

      const space = result?.spaceKey ? client.spaces.get(result.spaceKey) : undefined;
      if (!space) {
        log.warn('Space not found', result?.spaceKey);
        return;
      }

      await dispatch(createIntent(LayoutAction.SwitchWorkspace, { part: 'workspace', subject: space.id }));

      // TODO(wittjosiah): If navigableCollections is false and there's no target,
      //   should try to navigate to the first object of the space replicates.
      //   Potentially this could also be done on the inviters side to ensure there's always a target.
      const target = result?.target || (navigableCollections ? space?.id : undefined);
      if (target) {
        // Wait before navigating to the target node.
        // If the target has not yet replicated, this will trigger a loading toast.
        await graph.waitForPath({ target }).catch(() => {});
        await Promise.all([
          dispatch(createIntent(LayoutAction.Open, { part: 'main', subject: [target] })),
          dispatch(createIntent(LayoutAction.Expose, { part: 'navigation', subject: target })),
        ]);
      }

      await onDone?.(result);

      if (space) {
        await dispatch(
          createIntent(ObservabilityAction.SendEvent, { name: 'space.join', properties: { spaceId: space.id } }),
        );
      }
    },
    [dispatch, client, graph],
  );

  return (
    <Dialog.Content>
      <Dialog.Title classNames='sr-only'>{t('join space label', { ns: 'os' })}</Dialog.Title>
      <JoinPanel
        {...props}
        exitActionParent={<Dialog.Close asChild />}
        doneActionParent={<Dialog.Close asChild />}
        onDone={handleDone}
      />
    </Dialog.Content>
  );
};
