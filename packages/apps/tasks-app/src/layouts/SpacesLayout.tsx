//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { Outlet } from 'react-router-dom';

import { Menubar, Separator } from '@dxos/react-appkit';

import { Main } from '../components';

export const SpacesLayout = () => {
  return (
    <>
      <Menubar>
        <Separator className='grow' />
        {/* todo(thure): Replace `IdentityPopover` */}
      </Menubar>
      <Main>
        <Outlet />
      </Main>
    </>
  );
};
