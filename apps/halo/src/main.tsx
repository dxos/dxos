//
// Copyright 2020 DXOS.org
//

import debug from 'debug';
import React from 'react';
import { render } from 'react-dom';

import { App } from './App';

debug.enable('*');

// TODO(wittjosiah): StrictMode causing issues with the react sdk, re-enable once fixed.
render(
  // <StrictMode>
  <App />,
  // </StrictMode>
  document.getElementById('root')
);
