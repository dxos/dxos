//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { render } from 'react-dom';

import { ThemeProvider } from '@dxos/react-ui';

render(
  <ThemeProvider>
    {/* your components using react-ui here */}
  </ThemeProvider>,
  document.getElementById('root'),
);
