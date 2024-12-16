//
// Copyright 2024 DXOS.org
//

import React, { useCallback } from 'react';

import { LayoutAction, NavigationAction, useIntentDispatcher } from '@dxos/app-framework';
import { useGraph } from '@dxos/plugin-graph';
import { ObservabilityAction } from '@dxos/plugin-observability/meta';
import { useSpaces } from '@dxos/react-client/echo';
import { type InvitationResult } from '@dxos/react-client/invitations';
import { Dialog, useTranslation } from '@dxos/react-ui';
import { JoinPanel, type JoinPanelProps } from '@dxos/shell/react';

import { SPACE_PLUGIN } from '../meta';

export type JoinDialogProps = JoinPanelProps & {
  navigableCollections?: boolean;
};

export const JoinDialog = ({ navigableCollections, onDone, ...props }: JoinDialogProps) => {
  const { t } = useTranslation(SPACE_PLUGIN);
  const dispatch = useIntentDispatcher();
  const spaces = useSpaces();
  const { graph } = useGraph();

  const handleDone = useCallback(
    async (result: InvitationResult | null) => {
      if (result?.spaceKey) {
        await Promise.all([
          dispatch({
            action: LayoutAction.SET_LAYOUT,
            data: {
              element: 'toast',
              subject: {
                id: `${SPACE_PLUGIN}/join-success`,
                duration: 5_000,
                title: t('join success label'),
                closeLabel: t('dismiss label'),
              },
            },
          }),
          dispatch({
            action: LayoutAction.SET_LAYOUT,
            data: {
              element: 'dialog',
              state: false,
            },
          }),
        ]);
      }

      const space = spaces.find(({ key }) => result?.spaceKey?.equals(key));
      // TODO(wittjosiah): If navigableCollections is false and there's no target,
      //   should try to navigate to the first object of the space replicates.
      //   Potentially this could also be done on the inviters side to ensure there's always a target.
      const target = result?.target || (navigableCollections ? space?.id : undefined);
      if (target) {
        // Wait for up to 1 second before navigating to the target node.
        // If the target has not yet replicated, this will trigger a loading toast.
        await graph.waitForPath({ target }).catch(() => {});
        await Promise.all([
          dispatch({
            action: NavigationAction.OPEN,
            data: {
              activeParts: { main: [target] },
            },
          }),
          dispatch({
            action: NavigationAction.EXPOSE,
            data: {
              id: target,
            },
          }),
        ]);
      }

      await onDone?.(result);

      if (space) {
        await dispatch({
          action: ObservabilityAction.SEND_EVENT,
          data: {
            name: 'space.join',
            properties: {
              spaceId: space.id,
            },
          },
        });
      }
    },
    [dispatch, spaces],
  );

  return (
    <Dialog.Content>
      <JoinPanel
        {...props}
        exitActionParent={<Dialog.Close asChild />}
        doneActionParent={<Dialog.Close asChild />}
        onDone={handleDone}
      />
    </Dialog.Content>
  );
};
