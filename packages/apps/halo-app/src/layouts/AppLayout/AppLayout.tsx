//
// Copyright 2022 DXOS.org
//

import React, { ReactNode, useCallback } from 'react';
import { Outlet, useNavigate, useParams } from 'react-router-dom';

import { Menubar, useSafeSpaceKey, StatusIndicator, Separator, ProfileMenu } from '@dxos/react-appkit';
import { useClient, useIdentity, useSpace, useStatus } from '@dxos/react-client';
import { Button, useTranslation } from '@dxos/react-components';

const StatusContainer = () => {
  const status = useStatus();
  return <StatusIndicator status={status} />;
};

export interface AppLayoutProps {
  spacesPath?: string;
  spacePath?: string;
  manageSpacePath?: string;
  manageProfilePath?: string;
  menubarContent?: ReactNode;
  suppressSpaceMenu?: boolean;
}

export const AppLayout = ({
  spacesPath = '/spaces',
  // spacePath = '/spaces/:space',
  // manageSpacePath = '/spaces/:space/settings',
  manageProfilePath,
  menubarContent
}: AppLayoutProps) => {
  const client = useClient();
  const identity = useIdentity();
  const { space: spaceHex } = useParams();
  const spaceKey = useSafeSpaceKey(spaceHex, () => navigate(spacesPath));
  const space = useSpace(spaceKey);

  const { t } = useTranslation('appkit');

  const navigate = useNavigate();
  // const location = useLocation();
  // const pathSegments = location.pathname.split('/').length;
  // const isManagingSpace = !!spaceHex && pathSegments > 3;

  const handleManageProfile = useCallback(() => {
    if (manageProfilePath) {
      navigate(manageProfilePath);
    } else {
      const remoteSource = new URL(client.config.get('runtime.client.remoteSource') || 'https://halo.dxos.org');
      const tab = window.open(remoteSource.origin, '_blank');
      tab?.focus();
    }
  }, [client, navigate, manageProfilePath]);

  // const handleGoToSpace = useCallback(
  //   () => navigate(generatePath(spacePath, { space: spaceHex })),
  //   [navigate, spaceHex]
  // );
  //
  // const handleManageSpace = useCallback(
  //   () => navigate(generatePath(manageSpacePath, { space: spaceHex })),
  //   [navigate, spaceHex]
  // );
  //
  // const handleGoToSpaces = useCallback(() => navigate(spacesPath), [navigate]);

  return (
    <>
      <Menubar>
        <Separator className='grow' />
        {menubarContent}
        <Separator className='grow' />
        {identity && (
          <ProfileMenu profile={identity}>
            <Button onClick={handleManageProfile}>{t('manage profile label')}</Button>
          </ProfileMenu>
        )}
      </Menubar>
      <StatusContainer />
      <main className='max-is-5xl mli-auto pli-7 pbs-16'>
        <Outlet context={{ space }} />
      </main>
    </>
  );
};
