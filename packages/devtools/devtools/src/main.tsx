//
// Copyright 2022 DXOS.org
//

import '@dxos-theme';

import React from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './app/App';

// TODO(burdon): Why is strict mode disabled?
createRoot(document.getElementById('root')!).render(
  // <StrictMode>
  <App />,
  // </StrictMode>
);
