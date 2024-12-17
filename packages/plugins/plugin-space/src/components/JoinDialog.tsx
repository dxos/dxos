//
// Copyright 2024 DXOS.org
//

import React, { useCallback } from 'react';

import { createIntent, LayoutAction, NavigationAction, useIntentDispatcher } from '@dxos/app-framework';
import { useGraph } from '@dxos/plugin-graph';
import { ObservabilityAction } from '@dxos/plugin-observability/types';
import { useSpaces } from '@dxos/react-client/echo';
import { type InvitationResult } from '@dxos/react-client/invitations';
import { Dialog, useTranslation } from '@dxos/react-ui';
import { JoinPanel, type JoinPanelProps } from '@dxos/shell/react';

import { SPACE_PLUGIN } from '../meta';

export const JOIN_DIALOG = `${SPACE_PLUGIN}/JoinDialog`;

export type JoinDialogProps = JoinPanelProps & {
  navigableCollections?: boolean;
};

export const JoinDialog = ({ navigableCollections, ...props }: JoinDialogProps) => {
  const { t } = useTranslation(SPACE_PLUGIN);
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const spaces = useSpaces();
  const { graph } = useGraph();

  const handleDone = useCallback(
    async (result: InvitationResult | null) => {
      if (result?.spaceKey) {
        await Promise.all([
          dispatch(
            createIntent(LayoutAction.SetLayout, {
              element: 'toast',
              subject: {
                id: `${SPACE_PLUGIN}/join-success`,
                duration: 5_000,
                title: t('join success label'),
                closeLabel: t('dismiss label'),
              },
            }),
          ),
          dispatch(
            createIntent(LayoutAction.SetLayout, {
              element: 'dialog',
              state: false,
            }),
          ),
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
          dispatch(createIntent(NavigationAction.Open, { activeParts: { main: [target] } })),
          dispatch(createIntent(NavigationAction.Expose, { id: target })),
        ]);
      }

      if (space) {
        await dispatch(
          createIntent(ObservabilityAction.SendEvent, { name: 'space.join', properties: { spaceId: space.id } }),
        );
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
