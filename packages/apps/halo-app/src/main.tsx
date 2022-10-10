//
// Copyright 2020 DXOS.org
//

import React from 'react';
import { render } from 'react-dom';
// import debug from 'debug'
// import { log } from '@dxos/log'

// debug.enable('dxos:*')
// log.config.filter='debug'

import { App } from './App.js';

// TODO(wittjosiah): StrictMode causing issues with the react sdk, re-enable once fixed.
render(
  // <StrictMode>
  <App />,
  // </StrictMode>
  document.getElementById('root')
);
