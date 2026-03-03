//
// Copyright 2023 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { log } from '@dxos/log';
import { useClient } from '@dxos/react-client';
import {
  type InvitationUrlRequest,
  type LayoutRequest,
  ShellDisplay,
  ShellLayout,
  type ShellRuntime,
} from '@dxos/react-client';
import { type SpaceId, useSpace } from '@dxos/react-client/echo';
import { useAsyncEffect } from '@dxos/react-ui';

import { IdentityDialog } from '../IdentityDialog';
import { JoinDialog } from '../JoinDialog';
import { SpaceDialog } from '../SpaceDialog';
import { StatusDialog } from '../StatusDialog';

const blurActiveElement = () => (document.activeElement as HTMLElement | undefined)?.blur?.();

export const Shell = ({ runtime }: { runtime: ShellRuntime }) => {
  const [{ layout, invitationCode, spaceKey, spaceId, target }, setLayout] = useState<LayoutRequest>({
    layout: runtime.layout,
    invitationCode: runtime.invitationCode,
    spaceKey: runtime.spaceKey,
    spaceId: runtime.spaceId,
    target: runtime.target,
  });
  const [{ invitationUrl, deviceInvitationParam, spaceInvitationParam }, setInvitationUrl] =
    useState<InvitationUrlRequest>({
      invitationUrl: runtime.invitationUrl,
      deviceInvitationParam: runtime.deviceInvitationParam,
      spaceInvitationParam: runtime.spaceInvitationParam,
    });

  const client = useClient();
  const space = useSpace((spaceId as SpaceId | undefined) ?? spaceKey);

  const createDeviceInvitationUrl = (invitationCode: string) => {
    const baseUrl = new URL(invitationUrl);
    baseUrl.searchParams.set(deviceInvitationParam, invitationCode);
    return baseUrl.toString();
  };

  const createSpaceInvitationUrl = (invitationCode: string) => {
    const baseUrl = new URL(invitationUrl);
    baseUrl.searchParams.set(spaceInvitationParam, invitationCode);
    return baseUrl.toString();
  };

  useEffect(() => {
    const unsubscribeLayout = runtime.layoutUpdate.on((request) => setLayout(request));
    const unsubscribeInvitationUrl = runtime.invitationUrlUpdate.on((request) => setInvitationUrl(request));

    return () => {
      unsubscribeLayout();
      unsubscribeInvitationUrl();
    };
  }, [runtime]);

  useAsyncEffect(async () => {
    if (layout === ShellLayout.SPACE && !space) {
      log.warn('No space found for shell space invitations.');
      await runtime.setAppContext({ display: ShellDisplay.NONE });
      runtime.setLayout({ layout: ShellLayout.DEFAULT });
    }
  }, [runtime, layout, space]);

  switch (layout) {
    case ShellLayout.STATUS:
      return <StatusDialog />;
    case ShellLayout.INITIALIZE_IDENTITY:
    case ShellLayout.INITIALIZE_IDENTITY_FROM_INVITATION:
    case ShellLayout.INITIALIZE_IDENTITY_FROM_RECOVERY:
      return (
        <JoinDialog
          mode='halo-only'
          initialDisposition={
            layout === ShellLayout.INITIALIZE_IDENTITY_FROM_RECOVERY
              ? 'recover-identity'
              : layout === ShellLayout.INITIALIZE_IDENTITY_FROM_INVITATION
                ? 'accept-halo-invitation'
                : 'default'
          }
          initialInvitationCode={invitationCode}
          onCancelResetStorage={() => runtime.setLayout({ layout: ShellLayout.IDENTITY })}
          onDone={async () => {
            blurActiveElement();
            await runtime.setAppContext({ display: ShellDisplay.NONE });
            runtime.setLayout({ layout: ShellLayout.DEFAULT });
          }}
        />
      );

    case ShellLayout.IDENTITY:
    case ShellLayout.SHARE_IDENTITY:
    case ShellLayout.EDIT_PROFILE:
      return (
        <IdentityDialog
          createInvitationUrl={createDeviceInvitationUrl}
          onResetStorage={async () => {
            runtime.setLayout({ layout: ShellLayout.STATUS });
            await client.reset();
            return runtime.setAppContext({ display: ShellDisplay.NONE, reset: true });
          }}
          onRecover={async () => {
            runtime.setLayout({ layout: ShellLayout.STATUS });
            await client.reset();
            // TODO(wittjosiah): Enter join flow without reloading.
            return runtime.setAppContext({ display: ShellDisplay.NONE, reset: true, target: 'recoverIdentity' });
          }}
          onJoinNewIdentity={async () => {
            runtime.setLayout({ layout: ShellLayout.STATUS });
            await client.reset();
            // TODO(wittjosiah): Enter join flow without reloading.
            return runtime.setAppContext({ display: ShellDisplay.NONE, reset: true, target: 'deviceInvitation' });
          }}
          onDone={async () => {
            blurActiveElement();
            await runtime.setAppContext({ display: ShellDisplay.NONE });
            runtime.setLayout({ layout: ShellLayout.DEFAULT });
          }}
          initialDisposition={layout === ShellLayout.SHARE_IDENTITY ? 'manage-device-invitation' : 'default'}
        />
      );

    case ShellLayout.SPACE:
      return space ? (
        <SpaceDialog
          space={space}
          target={target}
          createInvitationUrl={createSpaceInvitationUrl}
          onDone={async () => {
            blurActiveElement();
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
            blurActiveElement();
            const target = result?.target ?? undefined;
            await runtime.setAppContext({
              display: ShellDisplay.NONE,
              spaceKey: result?.spaceKey ?? undefined,
              target,
            });
            runtime.setLayout({ layout: ShellLayout.DEFAULT });
          }}
          onExit={async () => {
            blurActiveElement();
            await runtime.setAppContext({ display: ShellDisplay.NONE });
            runtime.setLayout({ layout: ShellLayout.DEFAULT });
          }}
        />
      );

    default:
      return null;
  }
};
