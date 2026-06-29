//
// Copyright 2024 DXOS.org
//

import React, { useCallback } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation, Paths } from '@dxos/app-toolkit';
import { useAppGraph } from '@dxos/app-toolkit/ui';
import { Trigger } from '@dxos/async';
import { Graph } from '@dxos/plugin-graph';
import { ObservabilityOperation } from '@dxos/plugin-observability';
import { useClient } from '@dxos/react-client';
import { type Space } from '@dxos/react-client/echo';
import { type InvitationResult } from '@dxos/react-client/invitations';
import { Dialog, useTranslation } from '@dxos/react-ui';
import { type JoinPanelProps, JoinPanel } from '@dxos/shell/react';
import { osTranslations } from '@dxos/ui-theme';

import { meta } from '#meta';

export const JOIN_DIALOG = `${meta.profile.key}.JoinDialog`;

export type JoinDialogProps = JoinPanelProps & {
  navigableCollections?: boolean;
};

export const JoinDialog = ({ navigableCollections, onDone, ...props }: JoinDialogProps) => {
  const { invokePromise } = useOperationInvoker();
  const client = useClient();
  const { graph } = useAppGraph();
  const { t } = useTranslation(meta.profile.key);

  const handleDone = useCallback(
    async (result: InvitationResult | null) => {
      const spaceKey = result?.spaceKey;
      if (!spaceKey) {
        return;
      }

      await Promise.all([
        invokePromise(LayoutOperation.AddToast, {
          id: `${meta.profile.key}.join-success`,
          duration: 5_000,
          title: ['join-success.label', { ns: meta.profile.key }],
          closeLabel: ['dismiss.label', { ns: meta.profile.key }],
        }),
        invokePromise(LayoutOperation.UpdateDialog, { state: false }),
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

      await invokePromise(LayoutOperation.SwitchWorkspace, { subject: Paths.getSpacePath(space.id) });

      const target = result?.target;
      if (target) {
        // Wait before navigating to the target node.
        // If the target has not yet replicated, this will trigger a loading toast.
        await Graph.waitForPath(graph, { target }).catch(() => {});
        await Promise.all([
          invokePromise(LayoutOperation.Open, { subject: [target] }),
          invokePromise(LayoutOperation.Expose, { subject: target }),
        ]);
      } else {
        await invokePromise(LayoutOperation.Open, {
          subject: [Paths.getSpaceHomePath(space.id)],
          workspace: Paths.getSpacePath(space.id),
        });
      }

      onDone?.(result);

      if (space) {
        await invokePromise(ObservabilityOperation.SendEvent, {
          name: 'space.join',
          properties: {
            spaceId: space.id,
          },
        });
      }
    },
    [invokePromise, client, graph, navigableCollections, onDone],
  );

  // TODO(burdon): Move JoinHeading into Dialog.Heading.
  return (
    <Dialog.Content>
      <Dialog.Title classNames='sr-only'>{t('join-space.label', { ns: osTranslations })}</Dialog.Title>
      <Dialog.Body>
        <JoinPanel
          {...props}
          exitActionParent={<Dialog.Close asChild />}
          doneActionParent={<Dialog.Close asChild />}
          onDone={handleDone}
        />
      </Dialog.Body>
    </Dialog.Content>
  );
};
