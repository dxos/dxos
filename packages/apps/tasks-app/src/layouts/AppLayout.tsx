//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { Outlet } from 'react-router-dom';

import { Menubar, Separator } from '@dxos/react-appkit';
import { useIdentity } from '@dxos/react-client';

import { Main } from '../components';
import { IdentityPopover } from '../components/IdentityPopover';

export const AppLayout = () => {
  const identity = useIdentity();
  return (
    <>
      <Menubar>
        <Separator className='grow' />
        {identity && <IdentityPopover {...{ identity }} />}
      </Menubar>
      <Main>
        <Outlet />
      </Main>
    </>
  );
};
