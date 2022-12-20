//
// Copyright 2020 DXOS.org
//

import React from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './components';

(() => {
  createRoot(document.getElementById('root')!).render(<App />);
})();
