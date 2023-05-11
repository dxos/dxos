//
// Copyright 2023 DXOS.org
//

import React from 'react';
import { Navigate, Outlet, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { Document } from '@braneframe/types';
import { Button, useTranslation, MainRoot, Main, Sidebar, MainOverlay } from '@dxos/aurora';
import { defaultOsButtonColors } from '@dxos/aurora-theme';
import { CancellableInvitationObservable, Invitation, PublicKey, ShellLayout } from '@dxos/client';
import { useTelemetry, Toast } from '@dxos/react-appkit';
import { SpaceState, useIdentity, useInvitationStatus, useSpaceInvitations, useSpaces } from '@dxos/react-client';
import { ShellProvider, useShell } from '@dxos/react-shell';

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

  const { spaceKey } = useParams();
  const spaces = useSpaces();
  const allSpaces = useSpaces({ all: true });
  const space = allSpaces.find(
    (space) => abbreviateKey(space.key) === spaceKey && space.state.get() === SpaceState.READY
  );
  const invitations = useSpaceInvitations(space?.key);

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const spaceInvitationCode = searchParams.get('spaceInvitationCode');
  const haloInvitationCode = searchParams.get('haloInvitationCode');
  const embed = searchParams.get('embed');
  const location = searchParams.get('location');

  if (embed === 'true' && location && !spaceKey && spaces.length > 0) {
    const url = new URL(location);
    const source = url.hostname.split('.').reverse().join('.');
    const id = url.pathname.slice(1);
    // TODO(wittjosiah): Space picker.
    const space = spaces[0];
    const documents = space.db.query((obj) => {
      const keys = obj.meta?.keys;
      return keys?.find((key: any) => key.source === source && key.id === id);
    }).objects;
    let document = documents[0];
    if (!document) {
      document = new Document({
        meta: {
          keys: [{ source, id }]
        }
      });
      space.db.add(document);
    }
    return <Navigate to={`/${abbreviateKey(space.key)}/${documents[0].id}?embed=true`} />;
  }

  return (
    <ShellProvider
      space={space}
      spaceInvitationCode={spaceInvitationCode}
      haloInvitationCode={haloInvitationCode}
      onJoinedSpace={(nextSpaceKey) => {
        navigate(getPath(nextSpaceKey));
      }}
    >
      {/* TODO(burdon): Probably shouldn't introduce Octokit dep this high up. */}
      <OctokitProvider>
        <MainRoot>
          <MainOverlay />
          {embed !== 'true' && (
            <Sidebar
              {...{
                className: [defaultOsButtonColors, 'backdrop-blur overflow-visible'],
                onOpenAutoFocus: (event) => event.preventDefault(),
                onCloseAutoFocus: (event) => event.preventDefault()
              }}
            >
              <SidebarContent />
            </Sidebar>
          )}
          <Main className='min-bs-full'>
            <Outlet context={{ space }} />
            {embed !== 'true' && <SidebarToggle />}
          </Main>
        </MainRoot>
      </OctokitProvider>
      {space &&
        invitations.map((invitation) => {
          return <InvitationToast invitation={invitation} spaceKey={space.key} key={invitation.get().invitationId} />;
        })}
    </ShellProvider>
  );
};
