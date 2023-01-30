//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { generatePath, Outlet, useNavigate, useParams } from 'react-router-dom';

import { PublicKey } from '@dxos/client';
import { Menubar, Separator, SpaceLink } from '@dxos/react-appkit';
import { useIdentity, useSpace } from '@dxos/react-client';
import { Loading } from '@dxos/react-components';
import { IdentityPopover } from '@dxos/react-ui';

import { Main } from '../components';

export const SpaceSettingsLayout = () => {
  const { space: spaceHex } = useParams();
  const spaceKey = PublicKey.safeFrom(spaceHex);
  const space = spaceKey && useSpace(spaceKey);
  const identity = useIdentity();
  const navigate = useNavigate();
  return (
    <>
      <Menubar>
        <Separator className='grow' />
        {space && <SpaceLink onClickGoToSpace={() => navigate(generatePath('/spaces/:space', { space: spaceHex! }))} />}
        {identity && <IdentityPopover {...{ identity }} />}
      </Menubar>
      <Main>{space ? <Outlet context={{ space }} /> : <Loading label='Loading' />}</Main>
    </>
  );
};
