//
// Copyright 2020 DXOS.org
//

import React from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './app';
import { AppView } from './hooks';

import './style.css';

(() => {
  // TODO(burdon): Get debug from config.
  createRoot(document.getElementById('root')!).render(
    <App
      views={[AppView.CARDS, AppView.PROJECTS, AppView.KANBAN, AppView.TASKS, AppView.EDITOR, AppView.TEST]}
      debug={false}
    />
  );
})();
