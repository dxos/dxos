//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { Outlet } from 'react-router-dom';

import { ShellLayout } from '@dxos/client';
import { useClient, useCurrentSpace } from '@dxos/react-client';

const Placeholder = () => (
  <header className='header'>
    <h1>todos</h1>
    <input className='new-todo' placeholder='What needs to be done?' />
  </header>
);

export const Layout = () => {
  const client = useClient();
  const space = useCurrentSpace();

  return (
    <>
      <button id='open' onClick={() => client.shell?.setLayout(ShellLayout.SPACE_LIST)} data-testid='open-button'>
        ❯
      </button>
      <section className='todoapp'>{space ? <Outlet context={{ space }} /> : <Placeholder />}</section>
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
