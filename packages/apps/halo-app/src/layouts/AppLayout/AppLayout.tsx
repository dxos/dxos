//
// Copyright 2022 DXOS.org
//

import React, { ReactNode, useCallback } from 'react';
import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';

import { Button, useTranslation } from '@dxos/aurora';
import { Menubar, useSafeSpaceKey, Separator, ProfileMenu, SpacesLink } from '@dxos/react-appkit';
import { useClient } from '@dxos/react-client';
import { useSpace } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';

export interface AppLayoutProps {
  spacesPath?: string;
  manageProfilePath?: string;
  menubarContent?: ReactNode;
}

export const AppLayout = ({ spacesPath = '/spaces', manageProfilePath, menubarContent }: AppLayoutProps) => {
  const client = useClient();
  const identity = useIdentity();
  const { space: spaceHex } = useParams();
  const spaceKey = useSafeSpaceKey(spaceHex, () => navigate(spacesPath));
  const space = useSpace(spaceKey);

  const { t } = useTranslation('appkit');

  const navigate = useNavigate();
  const location = useLocation();
  const pathSegments = location.pathname.split('/').length;
  const isManagingSpace = !!spaceHex && pathSegments > 2;

  const handleManageProfile = useCallback(() => {
    if (manageProfilePath) {
      navigate(manageProfilePath);
    } else {
      const remoteSource = new URL(client.config.get('runtime.client.remoteSource') || 'https://halo.dxos.org');
      const tab = window.open(remoteSource.origin, '_blank');
      tab?.focus();
    }
  }, [client, navigate, manageProfilePath]);

  const handleGoToSpaces = useCallback(() => navigate(spacesPath), [navigate]);

  return (
    <>
      <Menubar>
        {isManagingSpace && <SpacesLink onClickGoToSpaces={handleGoToSpaces} />}
        <Separator className='grow' />
        {identity && (
          <ProfileMenu identity={identity}>
            <Button onClick={handleManageProfile}>{t('manage profile label')}</Button>
          </ProfileMenu>
        )}
      </Menubar>
      {/* TODO(thure): multiple Menubars messes up keyboard a11y */}
      <Menubar>
        <Separator className='grow' />
        {menubarContent}
        <Separator className='grow' />
      </Menubar>
      <main className='max-is-5xl mli-auto pli-7 pbs-16'>
        <Outlet context={{ space }} />
      </main>
    </>
  );
};
