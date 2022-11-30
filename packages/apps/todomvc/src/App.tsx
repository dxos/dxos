//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';

import { fromHost, fromIFrame } from '@dxos/client';
import { Config, Defaults, Dynamics } from '@dxos/config';
import { ClientProvider } from '@dxos/react-client';

import { Main, SpaceList } from './components';

export const App = () => {
  return (
    <ClientProvider
      config={async () => new Config(await Dynamics(), Defaults())}
      services={(config) => (process.env.DX_VAULT === 'false' ? fromHost(config) : fromIFrame(config))}
    >
      <HashRouter>
        <Routes>
          <Route path='/' element={<SpaceList />}>
            <Route path='/:space' element={<Main />} />
            <Route path='/:space/:state' element={<Main />} />
          </Route>
        </Routes>
      </HashRouter>
      <footer className='info'>
        <p>Double-click to edit a todo</p>
        <p>
          Created by <a href='https://github.com/dxos/'>DXOS</a>
        </p>
        <p>
          Based on <a href='https://todomvc.com'>TodoMVC</a>
        </p>
      </footer>
    </ClientProvider>
  );
};
