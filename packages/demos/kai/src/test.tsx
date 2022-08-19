//
// Copyright 2020 DXOS.org
//

import React from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './components';

// TODO(burdon): Still triggers service workers (from main.tsx).

(() => {
  const root = createRoot(document.getElementById('root') as HTMLElement);
  root.render(
    <App />
  );
})();
