//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import React from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';

(() => {
  createRoot(document.getElementById('root')!).render(<App />);
})();
