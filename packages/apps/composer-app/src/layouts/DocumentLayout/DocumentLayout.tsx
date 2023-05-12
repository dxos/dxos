//
// Copyright 2023 DXOS.org
//

import React, { useEffect } from 'react';
import { Navigate, Outlet, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { Document } from '@braneframe/types';
import { Button, useTranslation, MainRoot, Main, Sidebar, MainOverlay } from '@dxos/aurora';
import { defaultOsButtonColors } from '@dxos/aurora-theme';
import { CancellableInvitationObservable, Invitation, PublicKey, ShellLayout, Text } from '@dxos/client';
import { useTelemetry, Toast } from '@dxos/react-appkit';
import {
  SpaceState,
  useIdentity,
  useInvitationStatus,
  useQuery,
  useSpaceInvitations,
  useSpaces
} from '@dxos/react-client';
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
  const embedded = searchParams.get('embed') === 'true';
  const location = searchParams.get('location');
  const url = location ? new URL(location) : undefined;
  const source = url?.hostname.split('.').reverse().join('.');
  const id = url?.pathname.slice(1);
  // TODO(wittjosiah): Space picker.
  const documents = useQuery(spaces[0], (obj) => {
    const keys = obj.meta?.keys;
    return keys?.find((key: any) => key.source === source && key.id === id);
  });

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.source !== window.parent) {
        return;
      }

      if (event.data.type === 'initial-data') {
        const document = new Document({
          meta: {
            keys: [{ source, id }]
          },
          content: new Text(event.data.content)
        });
        spaces[0].db.add(document);
      }
    };

    if (embedded && spaces.length > 0 && documents.length === 0) {
      window.addEventListener('message', handler);
      window.parent.postMessage({ type: 'request-initial-data' }, 'https://github.com');
      return () => window.removeEventListener('message', handler);
    }
  }, [embedded, spaces, documents]);

  if (embedded && !spaceKey && documents.length > 0) {
    return <Navigate to={`/${abbreviateKey(spaces[0].key)}/${documents[0].id}?embed=true`} />;
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
          {!embedded && (
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
            {!embedded && <SidebarToggle />}
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
