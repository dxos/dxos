//
// Copyright 2020 DXOS.org
//

import React from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './app';
import { AppView } from './hooks';

import './style.css';

(() => {
  const views = [AppView.PROJECTS];
  createRoot(document.getElementById('root')!).render(<App views={views} />);
})();
