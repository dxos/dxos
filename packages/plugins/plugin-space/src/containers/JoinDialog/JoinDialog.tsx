//
// Copyright 2024 DXOS.org
//

import React, { useCallback } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { Trigger } from '@dxos/async';
import { useClient } from '@dxos/react-client';
import { type Space } from '@dxos/react-client/echo';
import { type InvitationResult } from '@dxos/react-client/invitations';
import * as Dialog from '@dxos/react-ui/Dialog';
import { JoinPanel, type JoinPanelProps } from '@dxos/shell/react';

import { SpaceNamespace } from '../../namespace.ts';

export const JOIN_DIALOG = `${SpaceNamespace.key}.JoinDialog`;

export type JoinDialogProps = JoinPanelProps & {
  navigableCollections?: boolean;
};

export const JoinDialog = ({ navigableCollections, onDone, ...props }: JoinDialogProps) => {
  const { invokePromise } = Hooks.useOperationInvoker();
  const client = useClient();

  const handleDone = useCallback(
    async (result: InvitationResult | null) => {
      const spaceKey = result?.spaceKey;
      if (!spaceKey) {
        return;
      }

      await Promise.all([
        invokePromise(LayoutOperation.AddToast, {
          id: `${SpaceNamespace.key}.join-success`,
          duration: 5_000,
          title: ['join-success.label', { ns: SpaceNamespace.key }],
          closeLabel: ['dismiss.label', { ns: SpaceNamespace.key }],
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

      // TODO(wittjosiah): `result.target` is ignored so acceptance navigates to the space home
      // immediately; revisit how to incorporate the target once immediate navigation is settled.
      await invokePromise(LayoutOperation.Open, {
        subject: [GraphPath.getSpaceHomePath(space.id)],
        workspace: GraphPath.getSpacePath(space.id),
        navigation: 'immediate',
      });

      onDone?.(result);
    },
    [invokePromise, client, navigableCollections, onDone],
  );

  // The panel supplies the Header (and its Title), then each step's Body and Footer.
  return (
    <Dialog.Content>
      <JoinPanel
        {...props}
        exitActionParent={<Dialog.CloseTrigger asChild />}
        doneActionParent={<Dialog.CloseTrigger asChild />}
        onDone={handleDone}
      />
    </Dialog.Content>
  );
};

JoinDialog.displayName = 'JoinDialog';
