//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { render } from 'react-dom';

import { ThemeProvider } from '@dxos/aurora-theme';

render(
  <ThemeProvider>{/* your components here */}</ThemeProvider>,
  document.getElementById('root'),
);
