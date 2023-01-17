//
// Copyright 2020 DXOS.org
//

import '@dxosTheme';
import React from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';

import '@dxos/kai/style.css';

// TODO(burdon): Get debug from config.
createRoot(document.getElementById('root')!).render(<App />);
