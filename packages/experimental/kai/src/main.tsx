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
      views={[
        AppView.DASHBOARD,
        AppView.ORG,
        AppView.PROJECTS,
        AppView.CONTACTS,
        AppView.KANBAN,
        AppView.TASKS,
        AppView.GRAPH,
        AppView.EDITOR
      ]}
      debug={false}
    />
  );
})();
