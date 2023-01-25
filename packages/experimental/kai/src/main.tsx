//
// Copyright 2020 DXOS.org
//

import React from 'react';
import { createRoot } from 'react-dom/client';

import '@dxosTheme';

import { Root } from './Root';
import { AppState } from './hooks';

import '../style.css';

const initialState: AppState = {
  dev: process.env.KAI_DEV === 'true',
  debug: process.env.KAI_DEBUG === 'true'
};

createRoot(document.getElementById('root')!).render(<Root initialState={initialState} />);
