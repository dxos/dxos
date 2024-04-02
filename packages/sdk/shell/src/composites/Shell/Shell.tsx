//
// Copyright 2023 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { log } from '@dxos/log';
import { type LayoutRequest, ShellDisplay, ShellLayout, type ShellRuntime, useClient } from '@dxos/react-client';
import { useSpace } from '@dxos/react-client/echo';

import { IdentityDialog } from '../IdentityDialog';
import { JoinDialog } from '../JoinDialog';
import { SpaceDialog } from '../SpaceDialog';

export const Shell = ({ runtime, origin }: { runtime: ShellRuntime; origin: string }) => {
  const [{ layout, invitationCode, spaceKey, target }, setLayout] = useState<LayoutRequest>({
    layout: runtime.layout,
    invitationCode: runtime.invitationCode,
    spaceKey: runtime.spaceKey,
    target: runtime.target,
  });

  const client = useClient();
  const space = useSpace(spaceKey);

  useEffect(() => {
    return runtime.layoutUpdate.on((request) => setLayout(request));
  }, [runtime]);

  useEffect(() => {
    if (layout === ShellLayout.SPACE && !space) {
      log.warn('No space found for shell space invitations.');

      const timeout = setTimeout(async () => {
        await runtime.setAppContext({ display: ShellDisplay.NONE });
        runtime.setLayout({ layout: ShellLayout.DEFAULT });
      });

      return () => clearTimeout(timeout);
    }
  }, [runtime, layout, space]);

  switch (layout) {
    case ShellLayout.INITIALIZE_IDENTITY:
    case ShellLayout.INITIALIZE_IDENTITY_FROM_INVITATION:
      return (
        <JoinDialog
          mode='halo-only'
          initialDisposition={
            layout === ShellLayout.INITIALIZE_IDENTITY_FROM_INVITATION ? 'accept-halo-invitation' : 'default'
          }
          initialInvitationCode={invitationCode}
          onCancelResetStorage={() => runtime.setLayout({ layout: ShellLayout.IDENTITY })}
          onDone={() => {
            void runtime.setAppContext({ display: ShellDisplay.NONE });
            runtime.setLayout({ layout: ShellLayout.DEFAULT });
          }}
        />
      );

    // TODO(wittjosiah): Jump straight to specific step if SHARE or EDIT are specified.
    case ShellLayout.IDENTITY:
    case ShellLayout.SHARE_IDENTITY:
    case ShellLayout.EDIT_PROFILE:
      return (
        <IdentityDialog
          createInvitationUrl={(invitationCode) => `${origin}?deviceInvitationCode=${invitationCode}`}
          onResetStorage={async () => {
            await client.reset();
            return runtime.setAppContext({ display: ShellDisplay.NONE, reload: true });
          }}
          onJoinNewIdentity={async () => {
            await client.reset();
            return runtime.setLayout({ layout: ShellLayout.INITIALIZE_IDENTITY_FROM_INVITATION });
          }}
          onDone={async () => {
            await runtime.setAppContext({ display: ShellDisplay.NONE });
            runtime.setLayout({ layout: ShellLayout.DEFAULT });
          }}
        />
      );

    case ShellLayout.SPACE:
      return space ? (
        <SpaceDialog
          space={space}
          target={target}
          createInvitationUrl={(invitationCode) => `${origin}?spaceInvitationCode=${invitationCode}`}
          onDone={async () => {
            await runtime.setAppContext({ display: ShellDisplay.NONE });
            runtime.setLayout({ layout: ShellLayout.DEFAULT });
          }}
        />
      ) : null;

    case ShellLayout.JOIN_SPACE:
      return (
        <JoinDialog
          initialInvitationCode={invitationCode}
          onDone={async (result) => {
            const target = result?.target ?? undefined;
            await runtime.setAppContext({
              display: ShellDisplay.NONE,
              spaceKey: result?.spaceKey ?? undefined,
              target,
            });
            runtime.setLayout({ layout: ShellLayout.DEFAULT });
          }}
          onExit={async () => {
            await runtime.setAppContext({ display: ShellDisplay.NONE });
            runtime.setLayout({ layout: ShellLayout.DEFAULT });
          }}
        />
      );

    default:
      return null;
  }
};
