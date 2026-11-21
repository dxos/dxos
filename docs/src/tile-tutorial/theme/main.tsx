//
// Copyright 2026 DXOS.org
//

// #region main
import '@dxos-theme';

import React from 'react';
import { createRoot } from 'react-dom/client';

import '@dxos/react-ui/theme.css';
import * as Theme from '@dxos/react-ui/Theme';
import { translations } from '@dxos/react-ui/translations';

import { App } from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <Theme.Provider tx={Theme.defaultTx} resourceExtensions={translations}>
    <App />
  </Theme.Provider>,
);
// #endregion
