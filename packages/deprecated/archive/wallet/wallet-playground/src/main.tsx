//
// Copyright 2020 DXOS.org
//

import React from 'react';
import { createRoot } from 'react-dom/client';

import { ClientProvider } from '@dxos/react-client';

import { App } from './components';
import { configProvider } from './config';

const start = () => {
  createRoot(document.getElementById('root')!)
    .render(
      <ClientProvider config={configProvider}>
        <App />
      </ClientProvider>
    );
};

start();
