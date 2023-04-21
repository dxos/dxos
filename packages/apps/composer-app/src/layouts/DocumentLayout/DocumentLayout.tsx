//
// Copyright 2023 DXOS.org
//
import React from 'react';
import { Outlet, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { Button, defaultOsButtonColors, mx, useButtonShadow, useTranslation } from '@dxos/aurora';
import { CancellableInvitationObservable, Invitation, PublicKey, ShellLayout } from '@dxos/client';
import { useTelemetry, Toast } from '@dxos/react-appkit';
import { SpaceState, useIdentity, useInvitationStatus, useSpaceInvitations, useSpaces } from '@dxos/react-client';
import { PanelSidebarProvider, ShellProvider, useShell } from '@dxos/react-shell';

import { SidebarContent, SidebarToggle, OctokitProvider } from '../../components';
import { namespace, abbreviateKey, getPath } from '../../router';

const InvitationToast = ({
  invitation,
  spaceKey
}: {
  invitation: CancellableInvitationObservable;
  spaceKey: PublicKey;
}) => {
  const { status } = useInvitationStatus(invitation);
  const shell = useShell();
  const { t } = useTranslation('composer');
  const handleViewInvitations = async () => shell.setLayout(ShellLayout.SPACE_INVITATIONS, { spaceKey });
  return status === Invitation.State.READY_FOR_AUTHENTICATION ? (
    <Toast
      title={t('invitation ready for auth code message')}
      initiallyOpen
      actionTriggers={[
        {
          altText: 'View',
          trigger: <Button onClick={handleViewInvitations}>{t('view invitations label')}</Button>
        }
      ]}
    />
  ) : null;
};

export const DocumentLayout = () => {
  // TODO(wittjosiah): Settings to disable telemetry, sync from HALO?
  useTelemetry({ namespace });
  useIdentity({ login: true });
  const shadow = useButtonShadow('base');

  const { spaceKey } = useParams();
  const spaces = useSpaces({ all: true });
  const space = spaces.find((space) => abbreviateKey(space.key) === spaceKey && space.state.get() === SpaceState.READY);
  const invitations = useSpaceInvitations(space?.key);

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const spaceInvitationCode = searchParams.get('spaceInvitationCode');
  const haloInvitationCode = searchParams.get('haloInvitationCode');

  return (
    <ShellProvider
      space={space}
      spaceInvitationCode={spaceInvitationCode}
      haloInvitationCode={haloInvitationCode}
      onJoinedSpace={(nextSpaceKey) => {
        navigate(getPath(nextSpaceKey));
      }}
    >
      <OctokitProvider>
        <PanelSidebarProvider
          slots={{
            content: {
              children: <SidebarContent />,
              className: mx(defaultOsButtonColors, shadow, 'backdrop-blur overflow-visible'),
              onOpenAutoFocus: (event) => event.preventDefault(),
              onCloseAutoFocus: (event) => event.preventDefault()
            },
            main: { role: 'main', className: 'min-bs-full' }
          }}
        >
          <Outlet context={{ space }} />
          <SidebarToggle />
        </PanelSidebarProvider>
      </OctokitProvider>
      {space &&
        invitations.map((invitation) => {
          return <InvitationToast invitation={invitation} spaceKey={space.key} key={invitation.get().invitationId} />;
        })}
    </ShellProvider>
  );
};
