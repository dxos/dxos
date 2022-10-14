//
// Copyright 2020 DXOS.org
//

import React from 'react';
import { createRoot } from 'react-dom/client';

// import debug from 'debug'
// import { log } from '@dxos/log'

// debug.enable('dxos:*')
// log.config.filter='debug'

import { App } from './App';

createRoot(document.getElementById('root')!)
  .render(
      // <StrictMode>
      <App />
      // </StrictMode>
  );
