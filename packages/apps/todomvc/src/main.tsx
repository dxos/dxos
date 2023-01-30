//
// Copyright 2020 DXOS.org
//

import './main.css';
import '@dxos/client/shell.css';

import React from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';

createRoot(document.getElementById('root')!).render(<App />);
