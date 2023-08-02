//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { Outlet, useNavigate, useParams } from 'react-router-dom';

import { PublicKey } from '@dxos/client';
import { Menubar, Separator, SpaceMenu, SpacesLink, Loading } from '@dxos/react-appkit';
import { useSpace } from '@dxos/react-client/echo';

import { Main } from '../components';

export const SpaceLayout = () => {
  const params = useParams();
  const { spaceKey: spaceHex } = params;
  const spaceKey = PublicKey.safeFrom(spaceHex);
  const space = useSpace(spaceKey);
  const navigate = useNavigate();
  return (
    <>
      <Menubar>
        <SpacesLink onClickGoToSpaces={() => navigate('..')} />
        <Separator className='grow' />
        {space && <SpaceMenu space={space} onClickManageSpace={() => navigate('settings')} />}
        {/* todo(thure): Replace `IdentityPopover` */}
      </Menubar>
      <Main>{space ? <Outlet context={{ space }} /> : <Loading label='Loading' />}</Main>
    </>
  );
};
