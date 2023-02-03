//
// Copyright 2022 DXOS.org
//

import React, { useState } from 'react';
import { Outlet, useNavigate, useParams } from 'react-router-dom';

import { PublicKey } from '@dxos/client';
import { Menubar, Separator, SpaceMenu, SpacesLink } from '@dxos/react-appkit';
import { useIdentity, useSpace } from '@dxos/react-client';
import { IdentityPopover } from '@dxos/react-ui';

import { FrameType } from '../../../patterns/react-appkit/src/frames/FrameProps';
import { Main } from '../components';

export const SpaceLayout = () => {
  const { space: spaceHex } = useParams();
  const spaceKey = PublicKey.safeFrom(spaceHex);
  const space = spaceKey && useSpace(spaceKey);
  const identity = useIdentity();
  const navigate = useNavigate();

  const [mosaic, _setMosaic] = useState<FrameType>('shortStack');

  return (
    <>
      <Menubar>
        <SpacesLink onClickGoToSpaces={() => navigate('..')} />
        <Separator className='grow' />
        {space && <SpaceMenu space={space} onClickManageSpace={() => navigate('settings')} />}
        {identity && <IdentityPopover {...{ identity }} />}{' '}
      </Menubar>
      <Main>
        <Outlet context={{ space, mosaic }} />
      </Main>
    </>
  );
};
