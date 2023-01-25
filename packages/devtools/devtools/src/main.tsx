//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import React from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './app';

// TODO(burdon): Why is strict mode disabled?
createRoot(document.getElementById('root')!).render(
  // <StrictMode>
  <App />
  // </StrictMode>
);
