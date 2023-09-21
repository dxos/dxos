//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { render } from 'react-dom';

import { ThemeProvider } from '@dxos/aurora';

render(
  <ThemeProvider>
    {/* your components using aurora here */}
  </ThemeProvider>,
  document.getElementById('root'),
);
