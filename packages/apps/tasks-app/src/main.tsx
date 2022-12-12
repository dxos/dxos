//
// Copyright 2020 DXOS.org
//

import '@dxosTheme';
import React from 'react';
import { createRoot } from 'react-dom/client';
import './main.scss';

import { App } from './App';

createRoot(document.getElementById('root')!).render(<App />);
