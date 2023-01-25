//
// Copyright 2022 DXOS.org
//

import React from 'react';
import ReactDOM from 'react-dom/client';

import { ClientProvider } from '@dxos/react-client';

import App from './App';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <ClientProvider>
    <App />
  </ClientProvider>
);
