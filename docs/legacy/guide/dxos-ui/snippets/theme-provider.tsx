//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { createRoot } from 'react-dom/client';

import * as Theme from '@dxos/react-ui/Theme';

createRoot(document.getElementById('root')!).render(
  <Theme.Provider>{/* your components using react-ui here */}</Theme.Provider>,
);
