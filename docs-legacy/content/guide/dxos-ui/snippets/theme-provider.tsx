//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { createRoot } from 'react-dom/client';

import { ThemeProvider } from '@dxos/react-ui';

createRoot(document.getElementById('root')!).render(
  <ThemeProvider>{/* your components using react-ui here */}</ThemeProvider>,
);
