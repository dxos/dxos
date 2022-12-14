//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';

createRoot(document.getElementById('root')!)
  .render(
    // <StrictMode>
      <App />
    // </StrictMode>
  );
