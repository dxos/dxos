//
// Copyright 2020 DXOS.org
//

import React from 'react';
import { createRoot } from 'react-dom/client';

import '@dxosTheme';

import { App } from './app';
import { AppState } from './hooks';

import '../style.css';

const bool = (str?: string): boolean => (str ? /(true|1)/i.test(str) : false);

const initialState: AppState = {
  dev: bool(process.env.KAI_DEV),
  debug: bool(process.env.KAI_DEBUG),
  pwa: bool(process.env.KAI_PWA)
};

createRoot(document.getElementById('root')!).render(<App initialState={initialState} />);
