//
// Copyright 2022 DXOS.org
//

import cx from 'classnames';
import { Plus, Rocket } from 'phosphor-react';
import React, { useCallback } from 'react';
import { generatePath, Outlet, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { Space, Invitation } from '@dxos/client';
import { useClient, useIdentity, useSpace, useStatus } from '@dxos/react-client';
import { Button, getSize, Heading, JoinDialog, Menubar, useTranslation } from '@dxos/react-uikit';
import { humanize, MaybePromise } from '@dxos/util';

import { useSafeSpaceKey } from '../../hooks';
import { HeadingWithActions } from '../HeadingWithActions';
import { StatusIndicator } from '../StatusIndicator';

const invitationCodeFromUrl = (text: string) => {
  try {
    const searchParams = new URLSearchParams(text.substring(text.lastIndexOf('?')));
    const invitation = searchParams.get('invitation');
    return invitation ?? text;
  } catch (err) {
    console.error(err);
    return text;
  }
};

const StatusContainer = () => {
  const status = useStatus();
  return <StatusIndicator status={status} />;
};

export interface AppLayoutProps {
  homePath?: string;
  spacePath?: string;
  manageSpacePath?: string;
  onSpaceCreate?: (space: Space) => MaybePromise<void>;
}

export const AppLayout = ({
  homePath = '/',
  spacePath = '/spaces/:space',
  manageSpacePath = '/spaces/:space/settings',
  onSpaceCreate
}: AppLayoutProps) => {
  const { t } = useTranslation('appkit');
  const client = useClient();
  const identity = useIdentity();
  const { space: spaceHex } = useParams();
  const spaceKey = useSafeSpaceKey(spaceHex, () => navigate(homePath));
  const space = useSpace(spaceKey);

  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const invitationParam = searchParams.get('invitation');
  const pathSegments = location.pathname.split('/').length;
  const isManagingSpace = !!spaceHex && pathSegments > 3;
  const acceptInvitation = useCallback((invitation: Invitation) => client.echo.acceptInvitation(invitation), [client]);

  const handleCreateSpace = useCallback(async () => {
    const space = await client.echo.createSpace();
    await onSpaceCreate?.(space);
  }, [client, space]);

  const handleManageProfile = useCallback(() => {
    const remoteSource = new URL(client.config.get('runtime.client.remoteSource') || 'https://halo.dxos.org');
    const tab = window.open(remoteSource.origin, '_blank');
    tab?.focus();
  }, [client]);

  const handleGoToSpace = useCallback(
    () => navigate(generatePath(spacePath, { space: spaceHex })),
    [navigate, spaceHex]
  );

  const handleManageSpace = useCallback(
    () => navigate(generatePath(manageSpacePath, { space: spaceHex })),
    [navigate, spaceHex]
  );

  const handleGoToSpaces = useCallback(() => navigate(homePath), [navigate]);

  return (
    <>
      <Menubar
        profile={identity!}
        space={space}
        {...(isManagingSpace && { onClickGoToSpace: handleGoToSpace })}
        onClickManageSpace={handleManageSpace}
        onClickManageProfile={handleManageProfile}
        onClickGoToSpaces={handleGoToSpaces}
      >
        {space && (
          <Heading className='w-min truncate font-normal text-base pointer-events-auto'>{humanize(space.key)}</Heading>
        )}
      </Menubar>
      <StatusContainer />
      <main className='max-is-5xl mli-auto pli-7 pbs-20'>
        {!space && (
          <div role='none' className={cx('flex items-center gap-x-2 gap-y-4 my-4')}>
            <HeadingWithActions
              className='flex-auto text-center'
              actions={
                <>
                  <JoinDialog
                    initialInvitationCode={invitationParam ?? undefined}
                    parseInvitation={(invitationCode) => invitationCodeFromUrl(invitationCode)}
                    onJoin={({ spaceKey }) => navigate(generatePath(spacePath, { space: spaceKey!.toHex() }))}
                    acceptInvitation={acceptInvitation}
                    dialogProps={{
                      initiallyOpen: Boolean(invitationParam),
                      openTrigger: (
                        <Button className='grow flex gap-1'>
                          <Rocket className={getSize(5)} />
                          {t('join space label', { ns: 'uikit' })}
                        </Button>
                      )
                    }}
                  />
                  <Button variant='primary' onClick={handleCreateSpace} className='grow flex gap-1'>
                    <Plus className={getSize(5)} />
                    {t('create space label', { ns: 'uikit' })}
                  </Button>
                </>
              }
              heading={{
                children: t('spaces label')
              }}
            />
          </div>
        )}
        <Outlet context={{ space }} />
      </main>
    </>
  );
};
