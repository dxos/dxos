//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { Outlet } from 'react-router-dom';

import { ShellLayout, useCurrentSpace, useIdentity, useShell } from '@dxos/react-client';

export const Layout = () => {
  const { setLayout } = useShell();
  const identity = useIdentity();
  const space = useCurrentSpace();

  if (!identity) {
    return null;
  }

  return (
    <>
      <button id='open' onClick={() => setLayout(ShellLayout.SPACES)} data-testid='open-button'>
        ❯
      </button>
      <section className='todoapp'>{space && <Outlet context={{ space }} />}</section>
      <footer className='info'>
        <p>Double-click to edit a todo</p>
        <p>
          Created by <a href='https://github.com/dxos/'>DXOS</a>
        </p>
        <p>
          Based on <a href='https://todomvc.com'>TodoMVC</a>
        </p>
      </footer>
    </>
  );
};
