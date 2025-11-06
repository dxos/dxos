//
// Copyright 2024 DXOS.org
//

import React, { useCallback } from 'react';

import { LayoutAction, createIntent } from '@dxos/app-framework';
import { useAppGraph, useIntentDispatcher } from '@dxos/app-framework/react';
import { Trigger } from '@dxos/async';
import { ObservabilityAction } from '@dxos/plugin-observability/types';
import { useClient } from '@dxos/react-client';
import { type Space } from '@dxos/react-client/echo';
import { type InvitationResult } from '@dxos/react-client/invitations';
import { Dialog, useTranslation } from '@dxos/react-ui';
import { JoinPanel, type JoinPanelProps } from '@dxos/shell/react';

import { meta } from '../../meta';

export const JOIN_DIALOG = `${meta.id}/JoinDialog`;

export type JoinDialogProps = JoinPanelProps & {
  navigableCollections?: boolean;
};

export const JoinDialog = ({ navigableCollections, onDone, ...props }: JoinDialogProps) => {
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const client = useClient();
  const { graph } = useAppGraph();
  const { t } = useTranslation(meta.id);

  const handleDone = useCallback(
    async (result: InvitationResult | null) => {
      const spaceKey = result?.spaceKey;
      if (!spaceKey) {
        return;
      }

      await Promise.all([
        dispatch(
          createIntent(LayoutAction.AddToast, {
            part: 'toast',
            subject: {
              id: `${meta.id}/join-success`,
              duration: 5_000,
              title: ['join success label', { ns: meta.id }],
              closeLabel: ['dismiss label', { ns: meta.id }],
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

      let space = client.spaces.get(spaceKey);
      if (!space) {
        // TODO(wittjosiah): Add api to wait for a space.
        const trigger = new Trigger<Space>();
        client.spaces.subscribe(() => {
          const space = client.spaces.get(spaceKey);
          if (space) {
            trigger.wake(space);
          }
        });
        space = await trigger.wait();
      }

      await dispatch(
        createIntent(LayoutAction.SwitchWorkspace, {
          part: 'workspace',
          subject: space.id,
        }),
      );

      // TODO(wittjosiah): If navigableCollections is false and there's no target,
      //   should try to navigate to the first object of the space replicates.
      //   Potentially this could also be done on the inviters side to ensure there's always a target.
      const target = result?.target || (navigableCollections ? space?.id : undefined);
      if (target) {
        // Wait before navigating to the target node.
        // If the target has not yet replicated, this will trigger a loading toast.
        await graph.waitForPath({ target }).catch(() => {});
        await Promise.all([
          dispatch(
            createIntent(LayoutAction.Open, {
              part: 'main',
              subject: [target],
            }),
          ),
          dispatch(
            createIntent(LayoutAction.Expose, {
              part: 'navigation',
              subject: target,
            }),
          ),
        ]);
      }

      await onDone?.(result);

      if (space) {
        await dispatch(
          createIntent(ObservabilityAction.SendEvent, {
            name: 'space.join',
            properties: {
              spaceId: space.id,
            },
          }),
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
