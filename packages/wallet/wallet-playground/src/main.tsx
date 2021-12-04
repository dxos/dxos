//
// Copyright 2020 DXOS.org
//

import React from 'react';
import ReactDOM from 'react-dom';

import { ClientProvider } from '@dxos/react-client';

import { App } from './components';
import { configProvider } from './config';

const start = () => {
  ReactDOM.render(
    <ClientProvider config={configProvider}>
      <App />
    </ClientProvider>,
    document.getElementById('root')
  );
};

start();
