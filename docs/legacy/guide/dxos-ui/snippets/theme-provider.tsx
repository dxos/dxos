//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { createRoot } from 'react-dom/client';

import * as ThemeProvider from '@dxos/react-ui/ThemeProvider';

createRoot(document.getElementById('root')!).render(
  <ThemeProvider.ThemeProvider>{/* your components using react-ui here */}</ThemeProvider.ThemeProvider>,
);
