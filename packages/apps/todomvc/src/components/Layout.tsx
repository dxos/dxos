//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { Outlet } from 'react-router-dom';

import { ShellDisplay, useShell, useSpace } from '@dxos/react-client';

export const Layout = () => {
  const { setDisplay } = useShell();
  const space = useSpace();

  return (
    <>
      <button id='open' onClick={() => setDisplay(ShellDisplay.FULLSCREEN)} data-testid='open-button'>
        ❯
      </button>
      <section className='todoapp'>{space && <Outlet context={{ space }} />}</section>
    </>
  );
};
