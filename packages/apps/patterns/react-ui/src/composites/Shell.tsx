//
// Copyright 2023 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { ShellRuntime, ShellDisplay, ShellLayout } from '@dxos/client';
import { LayoutRequest } from '@dxos/protocols/proto/dxos/iframe';
import { useClient, useSpace, useSpaces } from '@dxos/react-client';

import { JoinDialog } from './JoinDialog';
import { SpaceDialog } from './SpaceDialog';

export const Shell = ({ runtime, origin }: { runtime: ShellRuntime; origin: string }) => {
  const client = useClient();
  const spaces = useSpaces();

  const [{ layout, invitationCode, spaceKey }, setLayout] = useState<LayoutRequest>({
    layout: runtime.layout,
    invitationCode: runtime.invitationCode,
    spaceKey: runtime.spaceKey
  });
  const space = useSpace(spaceKey);

  useEffect(() => {
    return runtime.layoutUpdate.on((request) => setLayout(request));
  }, []);

  switch (layout) {
    case ShellLayout.AUTH:
      return (
        <JoinDialog
          mode='halo-only'
          initialInvitationCode={invitationCode}
          onDone={async () => {
            // TODO(wittjosiah): Is this app-specific?
            const space = spaces[0] ?? (await client.echo.createSpace());
            await runtime.setAppContext({ display: ShellDisplay.NONE, spaceKey: space.key });
            runtime.setLayout(ShellLayout.DEFAULT);
          }}
        />
      );

    case ShellLayout.CURRENT_SPACE:
    case ShellLayout.SPACE_LIST:
      return (
        <SpaceDialog
          space={space}
          initialState={layout === ShellLayout.SPACE_LIST ? 'space list' : 'current space'}
          createInvitationUrl={(invitationCode) => `${origin}?spaceInvitationCode=${invitationCode}`}
          onClickJoinSpace={() => runtime.setLayout(ShellLayout.JOIN_SPACE)}
          onDone={async (space) => {
            // TODO(wittjosiah): If space is newly created the app won't yet know about it.
            //   This is a bug that needs to be fixed when upgrading the space service.
            await runtime.setAppContext({ display: ShellDisplay.NONE, spaceKey: space ? space.key : spaceKey });
            runtime.setLayout(ShellLayout.DEFAULT);
          }}
        />
      );

    case ShellLayout.JOIN_SPACE:
      return (
        <JoinDialog
          initialInvitationCode={invitationCode}
          onDone={async (result) => {
            await runtime.setAppContext({ display: ShellDisplay.NONE, spaceKey: result?.spaceKey ?? undefined });
            runtime.setLayout(ShellLayout.DEFAULT);
          }}
          onExit={async () => {
            await runtime.setAppContext({ display: ShellDisplay.NONE, spaceKey: runtime.spaceKey });
            runtime.setLayout(ShellLayout.DEFAULT);
          }}
        />
      );

    default:
      return null;
  }
};
