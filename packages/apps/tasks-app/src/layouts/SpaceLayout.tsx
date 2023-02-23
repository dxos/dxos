//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { Outlet, useNavigate, useParams } from 'react-router-dom';

import { PublicKey } from '@dxos/client';
import { Menubar, Separator, SpaceMenu, SpacesLink } from '@dxos/react-appkit';
import { useIdentity, useSpace } from '@dxos/react-client';
import { Loading } from '@dxos/react-components';
import { IdentityPopover } from '@dxos/react-ui';

import { Main } from '../components';

export const SpaceLayout = () => {
  const params = useParams();
  const { spaceKey: spaceHex } = params;
  const spaceKey = PublicKey.safeFrom(spaceHex);
  const space = useSpace(spaceKey);
  const identity = useIdentity();
  const navigate = useNavigate();
  return (
    <>
      <Menubar>
        <SpacesLink onClickGoToSpaces={() => navigate('..')} />
        <Separator className='grow' />
        {space && <SpaceMenu space={space} onClickManageSpace={() => navigate('settings')} />}
        {identity && <IdentityPopover {...{ identity }} />}{' '}
      </Menubar>
      <Main>{space ? <Outlet context={{ space }} /> : <Loading label='Loading' />}</Main>
    </>
  );
};
