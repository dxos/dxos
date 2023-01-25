//
// Copyright 2020 DXOS.org
//

import '@dxosTheme';
import React from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';

const root = createRoot(document.getElementById('root')!);

root.render(
  // <StrictMode>
  <App />
  // </StrictMode>
);
