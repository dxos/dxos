//
// Copyright 2023 DXOS.org
//

import React, { useState } from 'react';
import { Outlet, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { Document } from '@braneframe/types';
import { Button, useTranslation, Main, Toast } from '@dxos/aurora';
import { defaultOsButtonColors } from '@dxos/aurora-theme';
import { CancellableInvitationObservable, Invitation, PublicKey, ShellLayout } from '@dxos/client';
import { useTelemetry } from '@dxos/react-appkit';
import { SpaceState, useIdentity, useInvitationStatus, useSpaceInvitations, useSpaces } from '@dxos/react-client';
import { ShellProvider, useShell } from '@dxos/react-shell';

import { SidebarContent, SidebarToggle, OctokitProvider } from '../components';
import { namespace, abbreviateKey, getPath } from '../router';
import type { OutletContext } from './OutletContext';
import { EditorViewState } from './OutletContext';

const InvitationToast = ({
  invitation,
  spaceKey,
}: {
  invitation: CancellableInvitationObservable;
  spaceKey: PublicKey;
}) => {
  const { status } = useInvitationStatus(invitation);
  const shell = useShell();
  const { t } = useTranslation('composer');
  const handleViewInvitations = async () => shell.setLayout(ShellLayout.SPACE_INVITATIONS, { spaceKey });
  return status === Invitation.State.READY_FOR_AUTHENTICATION ? (
    <Toast.Root defaultOpen>
      <Toast.Body>
        <Toast.Title>{t('invitation ready for auth code message')}</Toast.Title>
      </Toast.Body>
      <Toast.Actions>
        <Toast.Action altText='View' asChild>
          <Button onClick={handleViewInvitations}>{t('view invitations label')}</Button>
        </Toast.Action>
      </Toast.Actions>
    </Toast.Root>
  ) : null;
};

export const StandaloneLayout = () => {
  // TODO(wittjosiah): Settings to disable telemetry, sync from HALO?
  useTelemetry({ namespace });
  useIdentity({ login: true });

  const { spaceKey, docKey } = useParams();
  const allSpaces = useSpaces({ all: true });
  const space = allSpaces.find(
    (space) => abbreviateKey(space.key) === spaceKey && space.state.get() === SpaceState.READY,
  );
  const document = space && docKey ? (space.db.getObjectById(docKey) as Document) : undefined;
  const invitations = useSpaceInvitations(space?.key);

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const spaceInvitationCode = searchParams.get('spaceInvitationCode');
  const deviceInvitationCode = searchParams.get('deviceInvitationCode');

  const [editorViewState, setEditorViewState] = useState<EditorViewState>('editor');

  return (
    <ShellProvider
      space={space}
      spaceInvitationCode={spaceInvitationCode}
      deviceInvitationCode={deviceInvitationCode}
      onJoinedSpace={(nextSpaceKey) => {
        navigate(getPath(nextSpaceKey));
      }}
    >
      {/* TODO(burdon): Probably shouldn't introduce Octokit dep this high up. */}
      <OctokitProvider>
        <Main.Root>
          <Main.Overlay />
          <Main.Sidebar swipeToDismiss classNames={[defaultOsButtonColors, 'backdrop-blur overflow-visible']}>
            <SidebarContent />
          </Main.Sidebar>
          <Main.Content classNames='min-bs-full'>
            <SidebarToggle />
            <Outlet
              context={{ space, document, layout: 'standalone', editorViewState, setEditorViewState } as OutletContext}
            />
          </Main.Content>
        </Main.Root>
      </OctokitProvider>
      {space &&
        invitations.map((invitation) => {
          return <InvitationToast invitation={invitation} spaceKey={space.key} key={invitation.get().invitationId} />;
        })}
    </ShellProvider>
  );
};
