//
// Copyright 2020 DXOS.org
//

import React from 'react';
import { createRoot } from 'react-dom/client';

import { Root } from './Root';
import { AppState } from './hooks';

const initialState: AppState = {
  demo: process.env.KAI_DEMO === 'true',
  debug: process.env.KAI_DEBUG === 'true'
};

createRoot(document.getElementById('root')!).render(<Root initialState={initialState} />);
