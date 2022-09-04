//
// Copyright 2020 DXOS.org
//

import debug from 'debug';
import React from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';

debug.enable('*');

const root = createRoot(document.getElementById('root') as HTMLElement);

// TODO(wittjosiah): StrictMode causing issues with the react sdk, re-enable once fixed.
root.render(
  // <StrictMode>
    <App />
  // </StrictMode>
);
