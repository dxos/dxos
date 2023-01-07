//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { Outlet, useNavigate, useParams } from 'react-router-dom';

import { PublicKey } from '@dxos/client';
import { Menubar, ProfileMenu, Separator, SpaceMenu, SpacesLink } from '@dxos/react-appkit';
import { useIdentity, useSpace } from '@dxos/react-client';

import { Main } from '../components';

export const SpaceLayout = () => {
  const { space: spaceHex } = useParams();
  const spaceKey = PublicKey.safeFrom(spaceHex);
  const space = spaceKey && useSpace(spaceKey);
  const identity = useIdentity();
  const navigate = useNavigate();
  return (
    <>
      <Menubar>
        <SpacesLink onClickGoToSpaces={() => navigate('..')} />
        <Separator className='grow' />
        {space && <SpaceMenu space={space} onClickManageSpace={() => navigate('settings')} />}
        {identity && <ProfileMenu profile={identity} />}
      </Menubar>
      <Main>
        <Outlet context={{ space }} />
      </Main>
    </>
  );
};
